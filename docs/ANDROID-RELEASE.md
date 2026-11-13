# META TRACKER — выпуск Android

Workflow Build signed Android release собирает подписанные APK и AAB.
Добавьте в GitHub Actions secrets ключ владельца приложения:
ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS,
ANDROID_KEY_PASSWORD. Храните резервную копию ключа вне репозитория.

После запуска скачайте artifact meta-tracker-android-release.
APK можно разместить в GitHub Releases и добавить его HTTPS-ссылку
в androidApkUrl в app-config.json. AAB загрузите в Google Play Console,
заполните карточку META TRACKER и отправьте приложение на проверку.
После публикации добавьте ссылку магазина в googlePlayUrl.
Пустые ссылки отображаются как недоступные и не ведут на выдуманные страницы.

Идентификатор app.frostmeta.mobile сохранён для совместимости обновлений.
Перед каждым новым выпуском увеличивайте versionCode в android/app/build.gradle.
Для обновления APK через Google Play требуется совместимая подпись:
согласуйте ключ подписи приложения с Play App Signing перед первым выпуском.
Проверьте актуальные требования Play Console к target SDK перед загрузкой.
