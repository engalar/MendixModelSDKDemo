export class EnumStrategy {
  extract(enums) {
    return enums.map(enumClass => ({
      className: enumClass.className,
      parentClass: enumClass.parentClass,
      entries: enumClass.entries,
      module: enumClass.module,
    }));
  }
}