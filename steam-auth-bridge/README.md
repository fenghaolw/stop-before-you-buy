## Deploy

```
gcloud functions deploy steamAuthBridge \
--gen2 --runtime nodejs22 --region us-central1 --source . \
--trigger-http --allow-unauthenticated \
--set-env-vars STEAM_API_KEY=<api_key>,SESSION_SECRET=<see_env>,CHROME_EXTENSION_ID=<see_env>,FUNCTION_URL=https://us-central1-stop-before-you-buy.cloudfunctions.net/steamAuthBridge
```