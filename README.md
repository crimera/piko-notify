# piko-notify
Cloudflare webworker for sending github notifications into a telegram group

# Usage
Set the following environment variables in the webworker
- TELEGRAM_TOKEN = "[your bot telegram token]"
- TELEGRAM_CHAT_ID = "[telegram chat id it starts with a negative number]"
- TELEGRAM_THREAD_ID = "[thread/topic id here]"
- SECRET = "[github webhook secret here]"
