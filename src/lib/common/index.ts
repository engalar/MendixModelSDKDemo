import { createIdentifier } from "@wendellhu/redi";

export interface IWidgetFactory {}

export const IWidgetFactory = createIdentifier<IWidgetFactory>("IWidget");
