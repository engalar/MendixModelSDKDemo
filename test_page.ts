//Model sdk demo

import { IModel, pages, texts } from "mendixmodelsdk";
import { main } from "./test";

//https://sprintr.home.mendix.com/link/teamserver/89a91e35-0f4f-4e27-81d9-d34ca76e31b9
main("89a91e35-0f4f-4e27-81d9-d34ca76e31b9", cb);

/**
 * 在模块AutoGen_1047创建一个简单页面
 * @param model
 * @returns
 */
async function cb(model: IModel) {
  const myModule = model.findModuleByQualifiedName("AutoGen_1047");

  // layout
  var layoutCallArgument1 = pages.LayoutCallArgument.create(model);
  (layoutCallArgument1 as any).__parameter.updateWithRawValue(
    "Atlas_Core.Atlas_Default.Main"
  );

  var layoutCall1 = pages.LayoutCall.create(model);
  const myLayout = await model
    .findLayoutByQualifiedName("Atlas_Core.Atlas_Default")
    .load();
  layoutCall1.layout = myLayout;
  layoutCall1.arguments.push(layoutCallArgument1);

  // page
  const myPage = pages.Page.createIn(myModule);
  myPage.name = "MyPage";
  myPage.layoutCall = layoutCall1;

  // div
  const myDiv = pages.DivContainer.create(model);
  layoutCallArgument1.widgets.push(myDiv);

  // label
  var appearance4 = pages.Appearance.create(model);
  appearance4.class = "pageheader-subtitle";

  var translation3 = texts.Translation.create(model);
  translation3.languageCode = "en_US";
  translation3.text =
    "These are the local users of your app. Please note that only these users should be managed in this app. MendixSSO users are provisioned by the MendixSSO module and should be managed from the App User Management screen (Developer Portal > General Settings > Manage App Users).";

  var translation4 = texts.Translation.create(model);
  translation4.languageCode = "nl_NL";
  translation4.text =
    "Dit overzicht toont de Mendix gebruikers die ten minste éénmaal in deze app zijn ingelogd. Beheer alleen de 'Lokale' gebruikers in deze app. Mendix SSO gebruikers worden vanuit de MendixSSO module aangemaakt en worden beheerd in de Developer Portal (Developer Portal > General Settings > Manage App Users).";

  var text3 = texts.Text.create(model);
  text3.translations.push(translation3);
  text3.translations.push(translation4);

  var text4 = texts.Text.create(model);

  var clientTemplate2 = pages.ClientTemplate.create(model);
  clientTemplate2.template = text3; // Note: for this property a default value is defined.
  clientTemplate2.fallback = text4; // Note: for this property a default value is defined.

  var label2_1 = pages.DynamicText.createInDivContainerUnderWidgets(myDiv);
  label2_1.name = "label2";
  label2_1.appearance = appearance4; // Note: for this property a default value is defined.
  label2_1.content = clientTemplate2; // Note: for this property a default value is defined.
  label2_1.renderMode = pages.TextRenderMode.H4;

  return true;
}
