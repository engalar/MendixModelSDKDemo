declare global {
    // --- 类型定义 ---
    interface GlobalOptions {
        verbose?: boolean;
    }

    interface AppCreateOptions extends GlobalOptions {
        appName: string;
    }

    interface AppDeleteOptions extends GlobalOptions {
        appName: string;
    }

    interface WorkcopyCreateOptions extends GlobalOptions {
        workcopyName: string;
    }

    interface WorkcopySetOptions extends GlobalOptions {
        workcopyName: string;
    }

    interface ModelModuleCreateOptions extends GlobalOptions {
        moduleName: string;
    }

    interface ModelModuleSetOptions extends GlobalOptions {
        moduleName: string;
    }

    interface ModelPageCreateOptions extends GlobalOptions {
        pageName: string;
    }

    interface ModelPageDeleteOptions extends GlobalOptions {
        pageName: string;
    }
}

export { };