# Bulgarian Language Support - Implementation Status

## ✅ What Has Been Done

1. **Database Migration**: Created migration to add `language` field to `orders` table
2. **TypeScript Types**: Updated Supabase types to include `language: 'en' | 'bg'`
3. **Translation Files**: Created call message translations in `lib/translations/call-messages.ts`
4. **i18n Library**: Installed `next-intl` package
5. **Language Switcher Component**: Created basic language switcher component

## ⚠️ Critical Issue: Twilio Voice Support for Bulgarian

### The Problem

**Twilio uses Amazon Polly for text-to-speech, and Amazon Polly does NOT support Bulgarian (bg-BG).**

This means we **cannot** simply use:

```xml
<Say voice="Polly.Joanna" language="bg-BG">Bulgarian text</Say>
```

### Solutions

#### Option 1: Pre-recorded Audio Files (Recommended for MVP)

- Generate Bulgarian audio files using Google Cloud TTS or Azure TTS
- Host audio files (Supabase Storage or CDN)
- Use Twilio's `<Play>` verb instead of `<Say>`

**Pros:**

- High quality, natural-sounding voices
- Full control over pronunciation
- Works immediately

**Cons:**

- Requires generating audio for all messages
- More storage needed
- Harder to handle dynamic content (customer names, amounts)

#### Option 2: Google Cloud TTS API (Real-time)

- Call Google Cloud TTS API during call to generate audio
- Store audio temporarily
- Use `<Play>` verb with generated audio URL

**Pros:**

- Handles dynamic content
- High quality
- Real-time generation

**Cons:**

- Additional API costs
- Slight latency
- Requires Google Cloud setup

#### Option 3: Use English Voice with Bulgarian Text (Not Recommended)

- Keep using Polly.Joanna but speak Bulgarian text
- Will sound very unnatural and hard to understand

## 📋 What Still Needs to Be Done

### 1. Complete i18n Setup

**Status**: Partially done - needs folder restructuring

**Issue**: `next-intl` requires a `[locale]` folder structure:

```
app/
  [locale]/
    page.tsx
    checkout/
      page.tsx
```

**Options**:

- **Option A**: Restructure entire app (recommended for proper i18n)
- **Option B**: Use simpler context-based i18n (faster, less proper)

**Recommendation**: For MVP, use a simpler approach with React Context to avoid major restructuring.

### 2. Update Call Handler

**Status**: Not started

**Tasks**:

- Read `language` from order
- Use appropriate voice/TTS method based on language
- Generate TwiML with correct language
- Add `language="bg-BG"` to `<Gather>` for speech recognition

### 3. Update Gemini Prompts

**Status**: Not started

**Tasks**:

- Add Bulgarian language instructions to all prompts
- Test with Bulgarian phrases
- Ensure intent classification works in Bulgarian

### 4. Update Order Creation

**Status**: Not started

**Tasks**:

- Capture language preference from UI
- Pass language to order creation API
- Store language in order record

### 5. Website Translation

**Status**: Basic translation files created, but not integrated

**Tasks**:

- Translate all UI components
- Integrate translations into components
- Add language switcher to header
- Test all pages in both languages

## 🚀 Recommended Implementation Order

### Phase 1: Quick Win - Simple Context-Based i18n

1. Create a simple React Context for language (avoid folder restructuring)
2. Add language switcher to header
3. Translate key pages (home, checkout)
4. Store language preference in localStorage

### Phase 2: Call System - Pre-recorded Audio

1. Generate Bulgarian audio files for all call messages
2. Upload to Supabase Storage
3. Update call-handler to:
   - Read language from order
   - Use `<Play>` for Bulgarian, `<Say>` for English
   - Add `language="bg-BG"` to `<Gather>`

### Phase 3: Gemini Integration

1. Update all prompts to handle Bulgarian
2. Test speech recognition
3. Test intent classification

### Phase 4: Polish

1. Test full flow end-to-end
2. Optimize audio quality
3. Add error handling

## 🔧 Technical Decisions Needed

1. **TTS Solution**: Pre-recorded audio vs. Google Cloud TTS API?
2. **i18n Approach**: Full next-intl restructuring vs. simple context?
3. **Language Detection**: Auto-detect from browser or manual selection only?

## 📝 Next Steps

1. **Decide on TTS approach** (I recommend pre-recorded audio for MVP)
2. **Choose i18n approach** (I recommend simple context for speed)
3. **Generate Bulgarian audio files** (if using pre-recorded)
4. **Update call-handler function** to support both languages
5. **Test with real calls**

## 🧪 Testing Checklist

- [ ] Website displays in Bulgarian when language is switched
- [ ] Language preference is saved and persists
- [ ] Order creation includes language field
- [ ] Call uses Bulgarian voice when order language is 'bg'
- [ ] Speech recognition works for Bulgarian
- [ ] Intent classification works for Bulgarian responses
- [ ] All call steps work in Bulgarian
- [ ] Error messages are in correct language
