declare global {
    // --- 类型定义 ---
    interface GlobalOptions {
        verbose?: boolean;
    }

    interface ModelOptions extends GlobalOptions {
        wc: boolean;
    }
    interface SessionOptions extends GlobalOptions {
    }
    interface ModuleOptions extends ModelOptions {

    }

    interface AppCreateOptions extends GlobalOptions {
        appName: string;
    }

    interface AppDeleteOptions extends GlobalOptions {
        appName: string;
    }

    interface AppSetOptions extends GlobalOptions {
        appId: string;
    }

    interface WorkcopyCreateOptions extends SessionOptions {
        sessionName: string;
    }

    interface WorkcopySetOptions extends SessionOptions {
        sessionName: string;
    }

    interface ModelModuleCreateOptions extends ModuleOptions {
        moduleName: string;
    }

    interface ModelModuleSetOptions extends ModuleOptions {
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