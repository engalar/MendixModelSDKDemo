//@ts-nocheck
import * as internal from "../sdk/internal";
export import StructureVersionInfo = internal.StructureVersionInfo;
import { common } from "../common";
import { projects } from "./projects";
export declare namespace domainmodels {
    class EntityCapabilities extends internal.Element<IModel> implements IEntityCapabilities {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsEntity(): Entity;
        /**
         * In version 8.14.0: added public
         */
        get countable(): boolean;
        set countable(newValue: boolean);
        constructor(model: internal.AbstractModel, structureTypeName: string, id: string, isPartial: boolean, unit: internal.ModelUnit, container: internal.AbstractElement);
        /**
         * Creates and returns a new EntityCapabilities instance in the SDK and on the server.
         * The new EntityCapabilities will be automatically stored in the 'capabilities' property
         * of the parent Entity element passed as argument.
         *
         * Warning! Can only be used on models with the following Mendix meta model versions:
         *  8.12.0 to 9.0.0
         */
        static createIn(container: Entity): EntityCapabilities;
        /**
         * Creates and returns a new EntityCapabilities instance in the SDK and on the server.
         * Expects one argument: the IModel object the instance will "live on".
         * After creation, assign or add this instance to a property that accepts this kind of objects.
         */
        static create(model: IModel): EntityCapabilities;
    }
    /**
     * In version 8.9.0: introduced
     */
    interface IEntityKey extends internal.IElement {
        readonly model: IModel;
        readonly parts: internal.IList<IEntityKeyPart>;
        asLoaded(): EntityKey;
        load(callback: (element: EntityKey) => void, forceRefresh?: boolean): void;
        load(forceRefresh?: boolean): Promise<EntityKey>;
    }

    class ValidationRule extends internal.Element<IModel> {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsEntity(): Entity;
        get attribute(): IAttribute;
        set attribute(newValue: IAttribute);
        get attributeQualifiedName(): string;
        get errorMessage(): texts.Text;
        set errorMessage(newValue: texts.Text);
        get ruleInfo(): RuleInfo;
        set ruleInfo(newValue: RuleInfo);
        constructor(model: internal.AbstractModel, structureTypeName: string, id: string, isPartial: boolean, unit: internal.ModelUnit, container: internal.AbstractElement);
        /**
         * Creates and returns a new ValidationRule instance in the SDK and on the server.
         * The new ValidationRule will be automatically stored in the 'validationRules' property
         * of the parent Entity element passed as argument.
         */
        static createIn(container: Entity): ValidationRule;
        /**
         * Creates and returns a new ValidationRule instance in the SDK and on the server.
         * Expects one argument: the IModel object the instance will "live on".
         * After creation, assign or add this instance to a property that accepts this kind of objects.
         */
        static create(model: IModel): ValidationRule;
    }
}
import { businessevents } from "./businessevents";
import { customwidgets } from "./customwidgets";
import { documenttemplates } from "./documenttemplates";
import { enumerations } from "./enumerations";
import { expressions } from "./expressions";
import { images } from "./images";
import { mlmappings } from "./mlmappings";
import { microflows } from "./microflows";
import { pages } from "./pages";
import { regularexpressions } from "./regularexpressions";
import { rest } from "./rest";
import { security } from "./security";
import { texts } from "./texts";
import { workflows } from "./workflows";
import { IModel } from "./base-model";