# Candidate interview experience

## Candidate journey

- Invitation sign-in keeps the existing email/access-code authentication and restores a direct interview link after sign-in.
- Candidate invitations retain feedback access and interview routes. The candidate shell retains the white sidebar, navbar and original Chirayu logo throughout AI and one-on-one interviews. Mobile navigation opens in a drawer, and the interview mounts only once.
- A separate device check shows the role, estimated duration (based on configured question count), Alex, microphone activity, camera preview, speaker playback and browser online/offline status. It requests real permissions.
- The live interview places Alex and the current question in the center, with a collapsible self-preview. Speech answers send after approximately 2.8 seconds of silence, or via Done speaking. No answer text field is rendered.
- “I’d like to respond” cancels Alex’s current speech and hands the turn back to the candidate. This is an explicit interruption control; automatic acoustic barge-in is not enabled because speaker echo can trigger false interruptions.
- The transcript is a dismissible overlay with speaker-separated paragraphs. Provisional speech appears subtly on the canvas. It is not a permanent chat column.
- Native screen capture expands into the primary canvas while Alex and the candidate stay visible. Capture is currently a local preview, not a stream sent to the AI or another participant. Candidates are told to describe their screen. AI screen analysis still needs a vision/media integration.
- Ending requires confirmation and releases camera, microphone and screen tracks. A separate completion screen leads to the existing feedback report and transcript download. Unfinished answers are identified before ending.

## Speech and mixed languages

Candidate settings do not expose language engines, provider names, model identifiers or technical voice configuration. Settings includes speaking pace and question replay. Alex uses available browser/device voices, preferring Natural/Neural voices matching the script/language of the response. There is no TTS API fee. Device voice quality and Hindi/Marathi availability vary.

The multilingual endpoint preserves audio transcription rather than translation, omits forced language in automatic mode, and asks the model to preserve English plus Hindi/Marathi Devanagari. Candidate responses are stored without LLM rewriting. Provisional browser captions are replaced by the final audio transcription.

**Deployment dependency:** no multilingual speech backend is configured in the current environment. Until connected, the existing browser speech fallback uses the browser locale and cannot guarantee code-switching accuracy. Hiding technical settings does not turn single-locale browser recognition into a multilingual recognizer. Real Hindi/Marathi/English recordings must be evaluated before claiming production accuracy.

Configure either option in `speech.env.example` and restart:

- `GROQ_API_KEY`: hosted Whisper large-v3. Free-tier limits are account-dependent; it is not an unlimited free service.
- `SPEECH_TRANSCRIPTION_URL`: your self-hosted OpenAI-compatible `/v1/audio/transcriptions` endpoint. Set its `SPEECH_TRANSCRIPTION_MODEL` and optional server-only `SPEECH_TRANSCRIPTION_API_KEY`. Self-hosting has compute costs even without API fees.

Audio is sent as a complete recording per turn (up to 120 seconds and 12 MB). Failed audio stays in memory for retry and is discarded on session exit. The application does not persist recordings. Browser/provider processing and retention depend on the configured service. Browser captions are provisional and may not preserve mixed language as accurately as the final multilingual transcription.

## Browser and hosting requirements

Use HTTPS or localhost. Embedded previews need `allow="microphone; camera; display-capture; fullscreen"` and compatible Permissions-Policy headers. Browser screen capture support varies. Online status indicates browser connectivity, not a measured connection to the AI service.

The existing ERP integration’s AI endpoints lack server-side candidate authentication. Apply the application’s access controls and request limits before exposing a metered transcription provider publicly.

## Verification

TypeScript no-emit, targeted ESLint and whitespace checks are run for this implementation. Chromium checks use simulated devices and mocked AI/transcription responses: device check, speaker playback, interruption, automatic single-turn submission, mixed-script rendering, transcript toggle, voice pace, camera collapse, full screen-share layout, stop-share cleanup, laptop controls, mobile overflow, end confirmation and media release. They validate real UI/media lifecycle code but do not measure microphone recognition accuracy or real TTS quality.

The optional regression script is `scripts/test-interview-browser.cjs`. It needs Playwright available (`npm install --no-save --ignore-scripts playwright` and a Playwright Chromium installation), plus a running development server. Run `node scripts/test-interview-browser.cjs`. Optional environment variables: `INTERVIEW_TEST_URL` (default `http://localhost:3095`), `PLAYWRIGHT_MODULE`, and `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Screenshots go to `test-results/interview-journey`. No real AI or feedback write is made by the test.

## Portal loading improvements

- The persistent white portal shell renders immediately; route-specific skeletons replace the full-screen credential spinner.
- Interview details and optional feedback fetch independently. Feedback no longer blocks the device check. Only the feedback ID is requested for this page.
- The AI room is loaded on demand for AI interviews. One-on-one pages keep their scheduling and Teams join functionality without initializing AI speech.
- Invitation lists request summary fields instead of resumes and full interview configuration. Card feedback requests are batched per user and select only the score/summary. Links remain usable while optional feedback loads.
- Main interview/list requests have a 10-second deadline and retry UI. Speech capability detection falls back after 3 seconds and its response can be reused for 30 seconds.
- `scripts/test-portal-loading.cjs` verifies delayed-feedback independence, one batch for three cards, white navigation/logo, one-on-one joining, mobile navigation and retry. It uses the same Playwright environment variables as the journey test and mocks network data. These are controlled regression checks, not a measurement of production database latency.
- Development mode still compiles a route on its first visit. Use the existing production build/start workflow for normal deployed use; it serves prebuilt routes.
