class EntityCapabilities extends internal.Element {
    constructor(model, structureTypeName, id, isPartial, unit, container) {
        super(model, structureTypeName, id, isPartial, unit, container);
        /** @internal */
        this.__countable = new internal.PrimitiveProperty(EntityCapabilities, this, "countable", true, internal.PrimitiveTypeEnum.Boolean);
        if (arguments.length < 4) {
            throw new Error("new EntityCapabilities() cannot be invoked directly, please use 'model.domainmodels.createEntityCapabilities()'");
        }
    }
    get containerAsEntity() {
        return super.getContainerAs(Entity);
    }
    /**
     * In version 8.14.0: added public
     */
    get countable() {
        return this.__countable.get();
    }
    set countable(newValue) {
        this.__countable.set(newValue);
    }
    /**
     * Creates and returns a new EntityCapabilities instance in the SDK and on the server.
     * The new EntityCapabilities will be automatically stored in the 'capabilities' property
     * of the parent Entity element passed as argument.
     *
     * Warning! Can only be used on models with the following Mendix meta model versions:
     *  8.12.0 to 9.0.0
     */
    static createIn(container) {
        internal.createInVersionCheck(container.model, EntityCapabilities.structureTypeName, { start: "8.12.0", end: "9.0.0" });
        return internal.instancehelpers.createElement(container, EntityCapabilities, "capabilities", false);
    }
    /**
     * Creates and returns a new EntityCapabilities instance in the SDK and on the server.
     * Expects one argument: the IModel object the instance will "live on".
     * After creation, assign or add this instance to a property that accepts this kind of objects.
     */
    static create(model) {
        return internal.instancehelpers.createElement(model, EntityCapabilities);
    }
    /** @internal */
    _initializeDefaultProperties() {
        super._initializeDefaultProperties();
        this.countable = true;
    }
}
EntityCapabilities.structureTypeName = "DomainModels$EntityCapabilities";
EntityCapabilities.versionInfo = new exports.StructureVersionInfo({
    introduced: "8.12.0",
    deleted: "9.0.1",
    deletionMessage: null,
    properties: {
        countable: {
            public: {
                currentValue: true,
                changedIn: ["8.14.0"]
            }
        }
    },
    public: {
        currentValue: true
    }
}, internal.StructureType.Element);
domainmodels.EntityCapabilities = EntityCapabilities;
class ValidationRule extends internal.Element {
    constructor(model, structureTypeName, id, isPartial, unit, container) {
        super(model, structureTypeName, id, isPartial, unit, container);
        /** @internal */
        this.__attribute = new internal.ByNameReferenceProperty(ValidationRule, this, "attribute", null, "DomainModels$Attribute");
        /** @internal */
        this.__errorMessage = new internal.PartProperty(ValidationRule, this, "errorMessage", null, true);
        /** @internal */
        this.__ruleInfo = new internal.PartProperty(ValidationRule, this, "ruleInfo", null, true);
        this.generalization = new internal.PartProperty(ValidationRule, this, "ruleInfo", null, true);
        if (arguments.length < 4) {
            throw new Error("new ValidationRule() cannot be invoked directly, please use 'model.domainmodels.createValidationRule()'");
        }
    }
    static createIn(container) {
        return internal.instancehelpers.createElement(container, ValidationRule, "validationRules", true);
    }
}
ValidationRule.structureTypeName = "DomainModels$ValidationRule";
ValidationRule.versionInfo = new exports.StructureVersionInfo({
    properties: {
        attribute: {
            required: {
                currentValue: true
            }
        },
        errorMessage: {
            required: {
                currentValue: true
            }
        },
        ruleInfo: {
            required: {
                currentValue: true
            }
        }
    }
}, internal.StructureType.Element);
domainmodels.ValidationRule = ValidationRule;