 
# Crypto-JS

Библиотека для просмотра установленных сертификатов, подписания данных и верификации подписей с помощью [КриптоПро ЭЦП Browser plug-in](https://www.cryptopro.ru/products/cades/plugin).

=> [ДЕМО](https://disaipe.github.io/crypto-js/example.html) <=<br>
(для работы необходим КриптоПро ЭЦП Browser plug-in)

## Перед использованием

Перед использованием Crypto-JS необходимо произвести установку *КриптоПро CSP* и *КриптоПро ЭЦП Browser plug-in* по инструкции ниже и запросить сертификат в удостоверяющем центре (например, в [тестовом центре КриптоПро](https://www.cryptopro.ru/certsrv/certrqma.asp)).

**КриптоПро CSP**
* Зарегистрироваться и войти на сайт https://www.cryptopro.ru/
* Скачать сертифицированный  дистрибутив КриптоПро CSP на странице [загрузок](https://www.cryptopro.ru/products/csp/downloads)
* Установить дистрибитив согласно официальной документации

**КриптоПро ЭЦП Browser plug-in**
* [MS Windows](https://cpdn.cryptopro.ru/default.asp?url=/content/cades/plugin-installation-windows.html)
* [Linux](https://cpdn.cryptopro.ru/default.asp?url=/content/cades/plugin-installation-unix.html)
* [Mac OS](https://cpdn.cryptopro.ru/default.asp?url=/content/cades/plugin-installation-macos.html)
* [Полная инструкция](https://cpdn.cryptopro.ru/default.asp?url=content/cades/plugin.html)

В результате установки *КриптоПро ЭЦП Browser plug-in* должен увидеть установленные в вашей системе сертификаты.

Проверить работу плагина можно на специальной [странице](https://www.cryptopro.ru/sites/default/files/products/cades/demopage/simple.html)

## Установка

1. Скачать и сохранить [cryptohelper.js](cryptohelper.js)
2. Подключить на странице вместе с `cadesplugin_api.js`:
	```html
	<script src='https://www.cryptopro.ru/sites/default/files/products/cades/cadesplugin_api.js'></script>
	<script src='/cryptohelper.js'></script>
	```

## Использование

Полный пример использования можно посмотреть на странице [example.html](example.html).

#### Создание экземпляра
```js
let crypto = new CryptoHelper();
crypto.init().then(() => {
	// плагин инициализирован и готов к работе
}).catch(() => {
	// пользователь отклонил запрос
});

// здесь плагин еще не инизиализирован
```

При вызове `CryptoHelper.init()` у пользователя будет запрошено разрешение на выполнение операций с ключами или сертификатами - если пользователь отклонит запрос, то плагин не будет активирован и дальнейшая работа станет бесполезной.

#### Получение сертификатов

Их хранилища пользователя запрашиваются только активные и валидные сертификаты.

```js
let certificates = await crypto.getCertificates();
// => [{
// 		$original: Object,
// 		subject: Object { name, email, company, city, ...},
// 		issuer: Object { name, email, company, ...},
// 		version: 3,
// 		serialNumber: "12003B1267D658852004813D6F0001003B1267",
// 		thumbprint: "75C9AD57EEC3A3E914FE1EDB518BD817EDE81797",
// 		validFrom: "2019-09-18T11:38:09.000Z",
// 		validTo: "2019-12-18T11:48:09.000Z",
// 		hasPrivate: true,
// 		isValid: true
// }, ...]
```

#### Подписание

Класс `CryptoHelper` содержит несколько методов подписания данных:

|Метод|Аргументы|Описание|
|---|---|---|
|sign|(Сertificate, String \| File \| FileList \| HtmlInputElement)|Общий метод|
|signString|(Сertificate, String, toBase64 = true)|Подписание строки|
|signFile|(Сertificate, File)|Подписание файла|
|signFileList|(Сertificate, FileList)|Подписание списка файлов|

Предпочтительней использовать общий метод, который автоматически выбирает нужны метод на основании переданных данных.

```js
// Подписание строки
let secret = 'My secret string';
let sign = await crypto.sign(certificate, secret);
// => 'MIIIgAYJKoZIhvc...'
```
```js
// Подписание файлов из <input id='filesToSign' type='file'>
let filesInput = document.getElementById('filesToSign');
let signs = await crypto.sign(certificate, filesInput);
// => ['MIII4QYJKoZIhv...', 'MIII4QYJKoZIhvc...', ...]

// Или так
let signs = await crypto.sign(certificate, filesInput.files);

// Подписание произвольного файла
let sign = await crypto.sign(certificate, filesInput.files[0]);
// => 'MIII4QYJKoZIhv...'
```

#### Верификация

Для проверки подлинности подписи для документа используется метод `CryptoHelper.verify()`

```js
let data = 'My secret string';
let sign = 'MIIIgAYJKoZIhvc...';

let signInfo = await crypto.verify(data, sign, true);

if (!signInfo) {
	// Подпись не валидна
} else {
	// Подпись валидна, вывести список подписей
	for (let sign in signInfo) {
		console.log(`Timestamp: ${sign.ts}, Name: ${sign.cert.subject.name}`);
	}
}
```
