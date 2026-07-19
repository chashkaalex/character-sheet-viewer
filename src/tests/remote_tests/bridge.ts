import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export enum Environment {
    TEST = 'test',
    PROD = 'prod'
}

// Paths to configuration files
const CREDENTIALS_PATH = path.join(__dirname, '../../../config/creds.json');
const TOKEN_PATH = path.join(__dirname, '../../../config/token.json');

/**
 * Loads the scriptId from .clasp.env.json
 */
function getScriptId(env: Environment): string {
    const claspConfigPath = path.join(__dirname, `../../../config/.clasp.${env}.json`);
    try {
        const content = fs.readFileSync(claspConfigPath, 'utf8');
        const config = JSON.parse(content);
        return config.scriptId;
    } catch (err: any) {
        throw new Error(`Could not load scriptId from ${claspConfigPath}: ${err.message}`);
    }
}

/**
 * Create an OAuth2 client with the given credentials.
 */
async function authorize(): Promise<OAuth2Client> {
    let credentials;
    try {
        const content = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
        credentials = JSON.parse(content);
    } catch (err: any) {
        throw new Error(`Error loading client secret file at ${CREDENTIALS_PATH}: ${err.message}`);
    }

    // Supports both 'installed' (Desktop) and 'web' types
    const key = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(key.client_id, key.client_secret, key.redirect_uris[0]);

    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        try {
            // Validate and refresh the token if needed
            await oAuth2Client.getAccessToken();
        } catch (refreshErr: any) {
            if (refreshErr.message && refreshErr.message.includes('invalid_grant')) {
                console.warn('\n⚠️ Saved OAuth token is invalid or expired (invalid_grant).');
                console.warn('Deleting stale token file and requesting re-authorization...\n');
                try {
                    fs.unlinkSync(TOKEN_PATH);
                } catch (unlinkErr: any) {
                    console.error(`Failed to delete token file: ${unlinkErr.message}`);
                }
                return await getNewToken(oAuth2Client);
            } else {
                throw refreshErr;
            }
        }
        return oAuth2Client;
    }

    return await getNewToken(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization.
 */
async function getNewToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Essential for getting a refresh_token
        prompt: 'select_account',
        scope: [
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/script.external_request',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/script.projects' // Required to actually call the API
        ]
    });

    console.log('Authorize this app by visiting this url:', authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const code = await new Promise<string>((resolve) => {
        rl.question('Enter the code from that page here: ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });

    try {
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Ensure directory exists before writing
        const dir = path.dirname(TOKEN_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('Token stored to', TOKEN_PATH);
        return oAuth2Client;
    } catch (err: any) {
        throw new Error(`Error retrieving access token: ${err.message}`);
    }
}

/**
 * Calls a Google Apps Script function
 */
export async function callGasFunction(env: Environment, functionName: string, params: any[]): Promise<any> {
    try {
        const auth = await authorize();
        const scriptId = getScriptId(env);
        console.log(`[Bridge] Calling GAS function '${functionName}' in environment '${env.toUpperCase()}' (ScriptId: ${scriptId})`);
        const script = google.script({ version: 'v1', auth });

        const response = await script.scripts.run({
            scriptId: scriptId,
            requestBody: {
                function: functionName,
                parameters: params,
                devMode: true // Executes the code currently in the editor (saved, not necessarily deployed)
            }
        });

        if (response.data.error) {
            const error = response.data.error;
            console.error('GAS Error:', error.message);
            if (error.details) {
                console.error('Details:', JSON.stringify(error.details, null, 2));
            }
            return null;
        }

        // The result is nested inside the response object
        return (response.data.response as any)?.result;
    } catch (err: any) {
        console.error('API Execution Error:', err.message);
        throw err;
    }
}
