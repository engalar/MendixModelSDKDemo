interface Data {
    units: Unit[];
}

interface Unit {
    $ID: string;
    $Type: string;
    $ContainerID?: string;
    $ContainerProperty?: string;
    [key: string]: any;
}

export function getEnums(
    targetType: string,
    targetProperty: string,
    data: Data,
): string[] {
    const result: string[] = [];
    const visited: Set<string> = new Set();

    function findEnums(currentUnits: Unit[], currentTargetType: string, currentTargetProperty: string) {
        for (const unit of currentUnits) {
            if (unit.$Type === currentTargetType) {
                const propertyValue = unit[currentTargetProperty];
                if (Array.isArray(propertyValue)) {
                    for (const item of propertyValue) {
                        if (item && typeof item === "object" && item.$Type) {
                            if (!visited.has(item.$ID)) {
                                result.push(item.$Type);
                                visited.add(item.$ID);
                            }

                            // 级联查找
                            findEnums([item], item.$Type, ""); // 空字符串表示 查找当前类型的直接属性
                            for (const key in item) {
                                if (key.startsWith("$") || key === "$ID" || key === "$Type")
                                    continue;
                                if (Array.isArray(item[key])) {
                                    for (const innerItem of item[key]) {
                                        if (innerItem && typeof innerItem === "object" && innerItem.$Type) {
                                            if (!visited.has(innerItem.$ID)) {
                                                result.push(innerItem.$Type);
                                                visited.add(innerItem.$ID)
                                            }
                                            findEnums([innerItem], innerItem.$Type, ""); // 空字符串表示 查找当前类型的直接属性
                                        }

                                    }
                                }
                                else if (item[key] && typeof item[key] === "object" && item[key].$Type) {
                                    if (!visited.has(item[key].$ID)) {
                                        result.push(item[key].$Type)
                                        visited.add(item[key].$ID)
                                    }

                                    findEnums([item[key]], item[key].$Type, ""); // 空字符串表示 查找当前类型的直接属性
                                }
                            }
                        }
                    }
                }
                else if (propertyValue && typeof propertyValue === "object" && propertyValue.$Type) {
                    if (!visited.has(propertyValue.$ID)) {
                        result.push(propertyValue.$Type);
                        visited.add(propertyValue.$ID);
                    }


                    findEnums([propertyValue], propertyValue.$Type, ""); // 空字符串表示 查找当前类型的直接属性
                    for (const key in propertyValue) {
                        if (key.startsWith("$") || key === "$ID" || key === "$Type")
                            continue;
                        if (Array.isArray(propertyValue[key])) {
                            for (const innerItem of propertyValue[key]) {
                                if (innerItem && typeof innerItem === "object" && innerItem.$Type) {
                                    if (!visited.has(innerItem.$ID)) {
                                        result.push(innerItem.$Type);
                                        visited.add(innerItem.$ID);
                                    }
                                    findEnums([innerItem], innerItem.$Type, ""); // 空字符串表示 查找当前类型的直接属性
                                }
                            }
                        } else if (propertyValue[key] && typeof propertyValue[key] === "object" && propertyValue[key].$Type) {
                            if (!visited.has(propertyValue[key].$ID)) {
                                result.push(propertyValue[key].$Type)
                                visited.add(propertyValue[key].$ID)
                            }

                            findEnums([propertyValue[key]], propertyValue[key].$Type, ""); // 空字符串表示 查找当前类型的直接属性
                        }
                    }
                }
            }

            for (const key in unit) {
                if (key.startsWith("$") || key === "$ID" || key === "$Type") {
                    continue;
                }

                const value = unit[key];

                if (Array.isArray(value)) {
                    for (const item of value) {
                        if (item && typeof item === "object") {
                            findEnums([item], currentTargetType, currentTargetProperty);
                        }
                    }
                }
                else if (value && typeof value === "object") {
                    findEnums([value], currentTargetType, currentTargetProperty);
                }
            }
        }
    }

    findEnums(data.units, targetType, targetProperty);
    return Array.from(new Set(result));
}
