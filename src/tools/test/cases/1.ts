//@ts-nocheck
export declare namespace codeactions {

    // ICodeActionParameter
    interface ICodeActionParameter extends internal.IElement, internal.IByNameReferrable {
        asLoaded(): CodeActionParameter;
    }

    abstract class CodeActionParameter extends internal.Element<IModel> implements ICodeActionParameter { }

    interface IParameterType extends internal.IElement {
        readonly containerAsCodeActionParameter: ICodeActionParameter;
    }
    interface IBasicParameterType extends IParameterType {
        readonly containerAsCodeActionParameter: ICodeActionParameter;
    }
    interface ICodeAction extends projects.IDocument {
        readonly actionParameters: internal.IList<ICodeActionParameter>;
    }
    interface IEntityTypeParameterType extends IParameterType {
        readonly containerAsCodeActionParameter: ICodeActionParameter;
    }
    interface IStringTemplateParameterType extends IParameterType {
        readonly containerAsCodeActionParameter: ICodeActionParameter;
    }

    // CodeActionParameter implements ICodeActionParameter
    abstract class ParameterType extends internal.Element<IModel> implements IParameterType {
        get containerAsCodeActionParameter(): CodeActionParameter;
    }
    class BasicParameterType extends ParameterType implements IBasicParameterType {
        get containerAsCodeActionParameter(): CodeActionParameter;
    }
    abstract class CodeAction extends projects.Document implements ICodeAction {
        get actionParameters(): internal.IList<CodeActionParameter>;
    }
}
export declare namespace javaactions {

    // ICodeActionParameter
    interface IExportMappingJavaActionParameterType extends codeactions.IParameterType {
        readonly containerAsCodeActionParameter: codeactions.ICodeActionParameter;
    }
    interface IImportMappingJavaActionParameterType extends codeactions.IParameterType {
        readonly containerAsCodeActionParameter: codeactions.ICodeActionParameter;
    }
    interface IJavaActionParameter extends codeactions.ICodeActionParameter {
    }
    interface IMicroflowJavaActionParameterType extends codeactions.IParameterType {
        readonly containerAsCodeActionParameter: codeactions.ICodeActionParameter;
    }
}
export declare namespace javascriptactions {

    // ICodeActionParameter
    interface IJavaScriptActionParameter extends codeactions.ICodeActionParameter {
    }
    interface INanoflowJavaScriptActionParameterType extends codeactions.IParameterType {
        readonly containerAsCodeActionParameter: codeactions.ICodeActionParameter;
    }

    // CodeActionParameter implements ICodeActionParameter
    class JavaScriptActionParameter extends codeactions.CodeActionParameter implements IJavaScriptActionParameter {
    }
    class NanoflowJavaScriptActionParameterType extends codeactions.ParameterType implements INanoflowJavaScriptActionParameterType {
        get containerAsCodeActionParameter(): codeactions.CodeActionParameter;
    }
}