import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Paths to configuration files
const CREDENTIALS_PATH = path.join(__dirname, '../../../config/creds.json');
const TOKEN_PATH = path.join(__dirname, '../../../config/token.json');
const CLASP_CONFIG_PATH = path.join(__dirname, '../../../config/.clasp.json');

/**
 * Loads the scriptId from .clasp.json
 */
function getScriptId(): string {
    try {
        const content = fs.readFileSync(CLASP_CONFIG_PATH, 'utf8');
        const config = JSON.parse(content);
        return config.scriptId;
    } catch (err: any) {
        throw new Error(`Could not load scriptId from ${CLASP_CONFIG_PATH}: ${err.message}`);
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

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Check if we have previously stored a token.
    if (fs.existsSync(TOKEN_PATH)) {
        const token = fs.readFileSync(TOKEN_PATH, 'utf8');
        oAuth2Client.setCredentials(JSON.parse(token));
        return oAuth2Client;
    }

    return getNewToken(oAuth2Client);
}

/**
 * Get and store new token after prompting for user authorization.
 */
function getNewToken(oAuth2Client: OAuth2Client): Promise<OAuth2Client> {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/documents',
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/script.projects',
            'https://www.googleapis.com/auth/script.external_request'
        ]
    });

    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

    return new Promise((resolve, reject) => {
        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oAuth2Client.getToken(code, (err, token) => {
                if (err) return reject(err);
                if (!token) return reject(new Error('No token returned'));
                oAuth2Client.setCredentials(token);
                // Store the token to disk for later program executions
                try {
                    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
                    console.log('Token stored to', TOKEN_PATH);
                } catch (writeErr: any) {
                    console.warn(`Could not save token to ${TOKEN_PATH}:`, writeErr.message);
                }
                resolve(oAuth2Client);
            });
        });
    });
}

/**
 * Calls a Google Apps Script function
 * @param functionName
 * @param params
 */
export async function callGasFunction(functionName: string, params: any[]): Promise<any> {
    try {
        const auth = await authorize();
        const scriptId = getScriptId();
        const script = google.script({ version: 'v1', auth });

        const response = await script.scripts.run({
            scriptId: scriptId,
            requestBody: {
                function: functionName,
                parameters: params,
                devMode: true
            }
        });

        if (response.data.error) {
            console.error('GAS Error:', response.data.error);
            if (response.data.error.details) {
                console.error('Details:', JSON.stringify(response.data.error.details, null, 2));
            }
            return null;
        }

        return (response.data.response as any)?.result;
    } catch (err: any) {
        console.error('API Error:', err.message);
        throw err;
    }
}
