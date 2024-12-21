import { IModel, pages } from "mendixmodelsdk";

export function createLayoutGrid(
    model: IModel,
    name: string,
): pages.LayoutGrid {
    const appearance3 = pages.Appearance.create(model);
    appearance3.class = "pageheader";

    const layoutGrid1 = pages.LayoutGrid.create(model);
    layoutGrid1.name = name;
    layoutGrid1.appearance = appearance3; // Note: for this property a default value is defined.
    return layoutGrid1;
}

