// Code Section
// genPage function implementation
function genPage(unit, model, data) {
    data.generalizations.forEach(gen => {
        var generalization = domainmodels.Generalization.create(model);
        generalization.__generalization.updateWithRawValue(gen.name);

        gen.attributes.forEach(attr => {
            var attributeType = domainmodels.StringAttributeType.create(model);
            if (attr.type === 'String') {
                attributeType.length = attr.length || 0;
            } else if (attr.type === 'Integer') {
                attributeType = domainmodels.IntegerAttributeType.create(model);
            }
            // Add support for other types if needed

            var storedValue = domainmodels.StoredValue.create(model);
            if (attr.defaultValue) {
                storedValue.defaultValue = attr.defaultValue;
            }

            var attribute = domainmodels.Attribute.create(model);
            attribute.name = attr.name;
            attribute.type = attributeType;
            attribute.value = storedValue;
        });
    });

    data.translations.forEach(trans => {
        var translation = texts.Translation.create(model);
        translation.languageCode = trans.languageCode;
        translation.text = trans.text;
    });

    data.validationRules.forEach(rule => {
        var validationRule = domainmodels.ValidationRule.create(model);
        validationRule.attribute = model.findAttributeByQualifiedName(rule.attribute);

        var text = texts.Text.create(model);
        rule.errorMessages.forEach(errorMsg => {
            var translation = texts.Translation.create(model);
            translation.languageCode = errorMsg.languageCode;
            translation.text = errorMsg.text;
            text.translations.push(translation);
        });

        validationRule.errorMessage = text;
        if (rule.type === 'Required') {
            validationRule.ruleInfo = domainmodels.RequiredRuleInfo.create(model);
        } else if (rule.type === 'Unique') {
            validationRule.ruleInfo = domainmodels.UniqueRuleInfo.create(model);
        }
    });

    data.layoutGrids.forEach(grid => {
        var layoutGrid = pages.LayoutGrid.create(model);
        layoutGrid.name = grid.name;
        layoutGrid.appearance = pages.Appearance.create(model);

        grid.rows.forEach(row => {
            var layoutGridRow = pages.LayoutGridRow.create(model);
            layoutGridRow.appearance = pages.Appearance.create(model);

            row.columns.forEach(column => {
                var layoutGridColumn = pages.LayoutGridColumn.create(model);
                layoutGridColumn.weight = column.weight;
                layoutGridColumn.appearance = pages.Appearance.create(model);

                column.widgets.forEach(widget => {
                    var textWidget = pages.DynamicText.create(model);
                    textWidget.name = widget.name;
                    textWidget.content = texts.Text.create(model);

                    widget.translations.forEach(translation => {
                        var textTranslation = texts.Translation.create(model);
                        textTranslation.languageCode = translation.languageCode;
                        textTranslation.text = translation.text;
                        textWidget.content.translations.push(textTranslation);
                    });

                    layoutGridColumn.widgets.push(textWidget);
                });

                layoutGridRow.columns.push(layoutGridColumn);
            });

            layoutGrid.rows.push(layoutGridRow);
        });
    });

    data.dataViews.forEach(view => {
        var dataView = pages.DataView.create(model);
        dataView.name = view.name;
        dataView.dataSource = pages.MicroflowSource.create(model);
        dataView.dataSource.microflowSettings = pages.MicroflowSettings.create(model);
        dataView.dataSource.microflowSettings.microflow = model.findMicroflowByQualifiedName(view.dataSource);

        view.widgets.forEach(widget => {
            var dynamicText = pages.DynamicText.create(model);
            dynamicText.name = widget.name;
            dynamicText.content = texts.Text.create(model);

            widget.translations.forEach(translation => {
                var textTranslation = texts.Translation.create(model);
                textTranslation.languageCode = translation.languageCode;
                textTranslation.text = translation.text;
                dynamicText.content.translations.push(textTranslation);
            });

            dataView.widgets.push(dynamicText);
        });

        view.footerWidgets.forEach(footerWidget => {
            var button = pages.ActionButton.create(model);
            button.name = footerWidget.name;
            button.caption = texts.Text.create(model);

            footerWidget.translations.forEach(translation => {
                var textTranslation = texts.Translation.create(model);
                textTranslation.languageCode = translation.languageCode;
                textTranslation.text = translation.text;
                button.caption.translations.push(textTranslation);
            });

            button.action = pages.NoClientAction.create(model); // Default to NoClientAction
            dataView.footerWidgets.push(button);
        });
    });
}

// Data Section
// This part will be used for dynamically injected data
var data = {
    generalizations: [
        {
            name: "System.User",
            attributes: [
                { name: "DisplayName", type: "String", length: 100 },
                { name: "EmailAddress", type: "String", length: 250, defaultValue: "" }
            ]
        }
    ],
    translations: [
        { languageCode: "en_US", text: "Email address is required." },
        { languageCode: "en_US", text: "Email address must be unique." }
    ],
    validationRules: [
        {
            attribute: "System.User.EmailAddress",
            type: "Required",
            errorMessages: [
                { languageCode: "en_US", text: "Email address is required." }
            ]
        },
        {
            attribute: "System.User.EmailAddress",
            type: "Unique",
            errorMessages: [
                { languageCode: "en_US", text: "Email address must be unique." }
            ]
        }
    ],
    layoutGrids: [
        {
            name: "MainGrid",
            rows: [
                {
                    columns: [
                        {
                            weight: 1,
                            widgets: [
                                {
                                    name: "HeaderText",
                                    translations: [
                                        { languageCode: "en_US", text: "Welcome to the Application" }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ],
    dataViews: [
        {
            name: "UserDetailsView",
            dataSource: "MyFirstModule.DS_GetUser",
            widgets: [
                {
                    name: "UserName",
                    translations: [
                        { languageCode: "en_US", text: "User Name" }
                    ]
                },
                {
                    name: "Email",
                    translations: [
                        { languageCode: "en_US", text: "Email Address" }
                    ]
                }
            ],
            footerWidgets: [
                {
                    name: "SaveButton",
                    translations: [
                        { languageCode: "en_US", text: "Save" }
                    ]
                },
                {
                    name: "CancelButton",
                    translations: [
                        { languageCode: "en_US", text: "Cancel" }
                    ]
                }
            ]
        }
    ]
};
