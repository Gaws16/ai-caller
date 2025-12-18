# Bulgarian Language Support - Analysis & Implementation Plan

## Current Setup Analysis

### What We Have:
1. **Call System**: Twilio with Amazon Polly TTS (currently using `Polly.Joanna` for English)
2. **AI Processing**: Google Gemini for intent classification and speech understanding
3. **Web Framework**: Next.js 16 with React
4. **Database**: Supabase PostgreSQL with orders table
5. **No i18n**: Currently no internationalization setup

### Current Call Flow:
1. Order is created → stored in `orders` table
2. Call is initiated → `initiate-call` function creates call record
3. Twilio calls customer → webhook to `call-handler` function
4. `call-handler` generates TwiML with English text using `Polly.Joanna` voice
5. Gemini AI processes customer's speech responses
6. Conversation continues in English

## Requirements for Bulgarian Support

### 1. Website Localization
- Translate all UI text (buttons, labels, messages)
- Add language switcher component
- Store user's language preference
- Pass language preference to order creation

### 2. Call System Localization
- Store language preference in order record
- Use Bulgarian voice in Twilio calls
- Translate all TwiML responses
- Update Gemini prompts to handle Bulgarian speech

## Potential Problems & Solutions

### Problem 1: Twilio/Amazon Polly Bulgarian Support
**Issue**: Amazon Polly (used by Twilio's `<Say>` verb) may not have native Bulgarian support.

**Solution Options**:
1. **Check Twilio Documentation**: Verify if `Polly` voices support `bg-BG` locale
2. **Alternative Voice**: If Polly doesn't support Bulgarian, we may need to:
   - Use Twilio's `<Play>` verb with pre-recorded audio files
   - Use external TTS service (Google Cloud TTS, Azure TTS) to generate audio, then host and play via `<Play>`
   - Use Twilio's newer TTS options if available

**Recommended Approach**: 
- First, test if `voice="Polly.Joanna" language="bg-BG"` works
- If not, use Google Cloud Text-to-Speech API to generate Bulgarian audio files
- Store audio files and reference them in TwiML using `<Play>`

### Problem 2: Gemini AI Bulgarian Understanding
**Issue**: Gemini needs to understand Bulgarian speech responses from customers.

**Solution**: 
- Update all Gemini prompts to explicitly mention Bulgarian language support
- Test with Bulgarian phrases to ensure proper intent classification
- May need to adjust prompts for Bulgarian grammar/syntax

### Problem 3: Speech Recognition Language
**Issue**: Twilio's `<Gather>` with `input="speech"` needs to know the language.

**Solution**:
- Add `language="bg-BG"` attribute to `<Gather>` verb
- Test speech recognition accuracy for Bulgarian

### Problem 4: Language Preference Storage
**Issue**: Orders table doesn't have a language field.

**Solution**:
- Create migration to add `language` field to `orders` table
- Default to `'en'` for backward compatibility
- Update order creation API to accept and store language

### Problem 5: Translation Quality
**Issue**: All TwiML responses are hardcoded in English.

**Solution**:
- Create translation files for all call steps
- Use a translation management system or simple JSON files
- Ensure translations are natural and contextually appropriate

## Implementation Steps

### Phase 1: Database & Infrastructure
1. ✅ Add `language` column to `orders` table (migration)
2. ✅ Set up i18n library (next-intl recommended)
3. ✅ Create translation files (en.json, bg.json)

### Phase 2: Website Localization
1. ✅ Add language switcher component
2. ✅ Translate all UI components
3. ✅ Update order creation to include language preference
4. ✅ Store language in localStorage/cookies for persistence

### Phase 3: Call System Localization
1. ✅ Update `call-handler` to read language from order
2. ✅ Create Bulgarian translation functions
3. ✅ Update TwiML generation to use correct language/voice
4. ✅ Test Bulgarian voice support (Polly or alternative)
5. ✅ Update Gemini prompts for Bulgarian understanding
6. ✅ Add `language="bg-BG"` to `<Gather>` verbs

### Phase 4: Testing
1. ✅ Test full flow: Bulgarian website → Bulgarian call
2. ✅ Test speech recognition accuracy
3. ✅ Test intent classification with Bulgarian responses
4. ✅ Verify voice quality and naturalness

## Technical Considerations

### Twilio Voice Options for Bulgarian:
1. **Polly with language attribute**: `<Say voice="Polly.Joanna" language="bg-BG">`
2. **Pre-recorded audio**: Generate audio files, host them, use `<Play>`
3. **External TTS**: Use Google Cloud TTS or Azure TTS, generate on-the-fly

### Recommended Stack:
- **i18n**: `next-intl` (popular, well-maintained)
- **TTS**: Google Cloud Text-to-Speech (excellent Bulgarian support)
- **Translation**: Manual translation files (JSON) for accuracy

### File Structure:
```
/messages
  /en.json
  /bg.json
/components
  /language-switcher.tsx
/lib
  /i18n.ts
  /translations/
    /call-messages.ts
```

## Next Steps

1. Verify Twilio Bulgarian voice support
2. Set up i18n infrastructure
3. Create database migration
4. Implement step by step

