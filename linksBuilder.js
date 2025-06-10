// Шаблони URL з “змінними” у вигляді ${…}
const urlTemplates = {
  urlItem: `https://demo-assets.advin-global.com/${clientName}/${item}.glb', //потрібно адаптувати під отримання усіх моделей в папці

  urlArButton: 'https://demo-assets.advin-global.com/${clientName}/${arButton}.psd', //потрібно адаптувати під отримання усіх моделей в папці

  urlUielements: "https://demo-assets.advin-global.com/${folderName}/${uiElementName}.psd', //потрібно адаптувати під отримання усіх моделей в папці
"
};

// Зовнішній контейнер з фактичними значеннями для плейсхолдерів
const templateParams = {
  urlItem: '12345',
  clientName: 'user_007',
  item: 'A1B2C3'
};

// Функція для підстановки
function buildUrl(template, params) {
  return template.replace(/\$\{(.+?)\}/g, (_, key) => params[key] ?? '');
}

// Приклад використання
const finalUrl1 = buildUrl(urlTemplates.посилання1, templateParams);
console.log(finalUrl1);
// → "https://api.example.com/items/12345/details"
