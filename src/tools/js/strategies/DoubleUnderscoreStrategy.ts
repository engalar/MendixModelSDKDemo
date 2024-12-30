export class DoubleUnderscoreStrategy {
  extract(properties) {
    return properties.map(prop => ({
      ...prop,
      properties: prop.properties.filter(p => p.startsWith('__')).map(p => p.replace(/^__/, ''))
    }));
  }
}