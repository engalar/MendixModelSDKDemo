import * as internal from "../sdk/internal";
export import StructureVersionInfo = internal.StructureVersionInfo;
import { common } from "../common";
import { projects } from "./projects";

export declare namespace domainmodels {
    // Enum类示例
    class ActionMoment extends internal.AbstractEnum {
        static Before: ActionMoment;
        static After: ActionMoment;
        protected qualifiedTsTypeName: string;
    }

    // 基础元素类示例
    class AccessRule extends internal.Element<IModel> {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsEntity(): Entity;
        get documentation(): string;
        set documentation(newValue: string);
        static createInEntityUnderAccessRules(container: Entity): AccessRule;
    }

    // 关联类示例
    interface IAssociationBase extends internal.IElement, internal.IByNameReferrable {
        readonly model: IModel;
        readonly containerAsDomainModel: IDomainModel;
        readonly name: string;
        readonly type: AssociationType;
        asLoaded(): AssociationBase;
    }

    class AssociationBase extends internal.Element<IModel> implements IAssociationBase {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsDomainModel(): DomainModel;
        get name(): string;
        set name(newValue: string);
    }

    // 实体类示例
    interface IEntity extends internal.IElement, internal.IByNameReferrable {
        readonly model: IModel;
        readonly containerAsDomainModel: IDomainModel;
        readonly name: string;
        asLoaded(): Entity;
    }

    class Entity extends internal.Element<IModel> implements IEntity {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsDomainModel(): DomainModel;
        get name(): string;
        set name(newValue: string);
    }

    // 域模型类示例
    interface IDomainModel extends projects.IModuleDocument {
        readonly model: IModel;
        readonly containerAsModule: projects.IModule;
        readonly entities: internal.IList<IEntity>;
        asLoaded(): DomainModel;
    }

    class DomainModel extends projects.ModuleDocument implements IDomainModel {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsModule(): projects.Module;
        get entities(): internal.IList<Entity>;
    }

    // 属性类示例
    interface IAttribute extends internal.IElement, internal.IByNameReferrable {
        readonly model: IModel;
        readonly containerAsEntity: IEntity;
        readonly name: string;
        asLoaded(): Attribute;
    }

    class Attribute extends internal.Element<IModel> implements IAttribute {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsEntity(): Entity;
        get name(): string;
        set name(newValue: string);
    }

    // 验证规则类示例
    class ValidationRule extends internal.Element<IModel> {
        static structureTypeName: string;
        static versionInfo: StructureVersionInfo;
        get containerAsEntity(): Entity;
        get attribute(): IAttribute;
        set attribute(newValue: IAttribute);
    }
}

import { IModel } from "./base-model";