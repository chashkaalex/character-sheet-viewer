
declare namespace google {
    namespace script {
        interface Run {
            withSuccessHandler(functionName: (result: any, userObject?: any) => void): Run;
            withFailureHandler(functionName: (error: Error, userObject?: any) => void): Run;
            withUserObject(object: any): Run;
            [key: string]: any; // Allow arbitrary server-side functions
        }
        const run: Run;
        const host: {
            close(): void;
            editor: {
                focus(): void;
            };
            setHeight(height: number): void;
            setWidth(width: number): void;
        };
        const url: {
            getLocation(functionName: (location: any) => void): void;
        };
    }
}

interface Window {
    currentSlotData: import('../../server/types').SlotData | null;
}
