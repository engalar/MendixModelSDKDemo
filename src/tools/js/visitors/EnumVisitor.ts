import * as t from '@babel/types';

export class EnumVisitor {
    private enums: any[] = [];

    visit(path) {
        if (t.isClassDeclaration(path.node) && this.isAbstractEnumClass(path.node)) {
            const className = path.node.id.name;
            const parentClass = this.getParentClassName(path.node);
            const entries = this.getEnumEntries(path);
            const module = this.getModule(path);

            this.enums.push({
                className,
                parentClass,
                entries,
                module,
            });
        }
    }

    getEnums() {
        return this.enums;
    }

    private isAbstractEnumClass(node) {
        return (
            node.superClass &&
            t.isMemberExpression(node.superClass) &&
            t.isIdentifier(node.superClass.object) &&
            node.superClass.object.name === 'internal' &&
            t.isIdentifier(node.superClass.property) &&
            node.superClass.property.name === 'AbstractEnum'
        );
    }

    private getParentClassName(node) {
        if (node.superClass) {
            // 如果 superClass 是一个 MemberExpression（例如 internal.AbstractEnum）
            if (node.superClass.type === 'MemberExpression') {
                const object = node.superClass.object.name; // 获取模块名称，例如 'internal'
                const property = node.superClass.property.name; // 获取类名称，例如 'AbstractEnum'
                return `${object}.${property}`; // 返回完整的父类名称，例如 'internal.AbstractEnum'
            }
            // 如果 superClass 是一个 Identifier（例如直接继承 AbstractEnum）
            else if (node.superClass.type === 'Identifier') {
                return node.superClass.name; // 直接返回类名称，例如 'AbstractEnum'
            }
        }
        return undefined; // 如果没有父类，返回 undefined
    }

    private getEnumEntries(path) {
        const entries = [];
        const className = path.node.id.name;
        console.log(`Extracting entries for class: ${className}`);

        path.parentPath.traverse({
            AssignmentExpression(assignmentPath) {
                console.log(`Found assignment: ${assignmentPath.toString()}`);
                if (
                    t.isMemberExpression(assignmentPath.node.left) &&
                    t.isIdentifier(assignmentPath.node.left.object) &&
                    assignmentPath.node.left.object.name === className &&
                    t.isIdentifier(assignmentPath.node.left.property)
                ) {
                    entries.push(assignmentPath.node.left.property.name);
                    console.log(`Added entry: ${assignmentPath.node.left.property.name}`);
                }
            },
        });

        return entries;
    }

    private getModule(path) {
        let module = '';
        path.findParent(parentPath => {
            if (t.isProgram(parentPath.node)) {
                parentPath.traverse({
                    AssignmentExpression(assignmentPath) {
                        console.log(`Found module assignment: ${assignmentPath.toString()}`);
                        if (
                            t.isMemberExpression(assignmentPath.node.left) &&
                            t.isIdentifier(assignmentPath.node.left.object) &&
                            t.isIdentifier(assignmentPath.node.left.property) &&
                            assignmentPath.node.left.property.name === path.node.id.name
                        ) {
                            module = assignmentPath.node.left.object.name;
                            console.log(`Found module: ${module}`);
                        }
                    },
                });
                return true;
            }
            return false;
        });
        return module;
    }
}