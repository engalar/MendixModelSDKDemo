// src/tools/js/visitors/ConstructorVisitor.ts
import * as t from '@babel/types';

export class ConstructorVisitor {
  private properties: Array<{
    className: string;
    parentClass: string;
    properties: string[];
  }> = [];

  visit(path) {
    if (t.isClassMethod(path.node) && path.node.kind === 'constructor') {
      const classDeclaration = path.findParent((p) => t.isClassDeclaration(p.node));
      if (classDeclaration) {
        const className = classDeclaration.node.id?.name || '';

        // Extract parent class name, including module name (e.g., "internal.Element")
        let parentClass = '';
        if (t.isIdentifier(classDeclaration.node.superClass)) {
          parentClass = classDeclaration.node.superClass.name;
        } else if (t.isMemberExpression(classDeclaration.node.superClass)) {
          const { object, property } = classDeclaration.node.superClass;
          if (t.isIdentifier(object) && t.isIdentifier(property)) {
            parentClass = `${object.name}.${property.name}`;
          }
        }

        // Extract properties starting with double underscores
        const properties = path.node.body.body
          .filter((statement) => t.isExpressionStatement(statement) && t.isAssignmentExpression(statement.expression))
          .map((statement) => statement.expression.left.property?.name)
          .filter((propertyName) => propertyName && propertyName.startsWith('__'));

        if (properties.length > 0) {
          this.properties.push({
            className,
            parentClass,
            properties,
          });
        }
      }
    }
  }

  getProperties() {
    return this.properties;
  }
}