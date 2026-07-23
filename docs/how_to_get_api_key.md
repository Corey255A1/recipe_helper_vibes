# How to Get a Google Gemini API Key

Follow these steps to obtain a Google Gemini API key and configure it for the Recipe Helper application:

## Step 1: Access Google AI Studio
1. Open your web browser and go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in using your Google Account (Gmail/Google Workspace).

## Step 2: Create a New API Key
1. Once logged in, click on the **"Get API key"** button (typically located in the upper-left navigation panel or on the main dashboard).
2. Click the **"Create API key"** button.
3. You will be prompted to choose a Google Cloud project:
   - Select **"Create API key in new project"** (recommended if you do not have an existing GCP project).
   - Alternatively, search for and select an existing Google Cloud project if you already have one configured.

## Step 3: Copy Your API Key
1. A dialog box will appear showing your new Gemini API key.
2. Click the **"Copy"** button to copy the key to your clipboard.
   > [!WARNING]
   > Keep this key secure and confidential. Never commit your API key directly to version control systems like GitHub.

## Step 4: Configure the Application
1. In the root directory of the `recipe_helper` project, locate the `.env.example` file.
2. Duplicate or rename `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open the newly created `.env` file and replace `your_gemini_api_key_here` with the copied API key:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here...
   ```
4. Save and close the `.env` file.

Now your application is ready to make requests to the Google Gemini API!
