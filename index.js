const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

//APOD

app.command("/vector-apod", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get(
      `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`
    );
    const data = response.data;
    if(data.media_type !== "image") {
      await respond({text: `*${data.title}*\n${data.explanation}\n\n🎥 Today's APOD is a video: ${data.url}`});
      return;
    }

    await respond({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: data.title
          }
        },
        {
          type: "image",
          image_url: data.url,
          alt_text: data.title
        },
        { 
          type: "section",
          text: {
            type: "mrkdwn",
            text: data.explanation
          }  
        }
      ]
    });
  }
  catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch NASA's Astronomy Picture of the Day." });
  }
});

//EARTH

app.command("/vector-earth", async ({ ack, respond }) => {
  await ack();
  
  let imageUrl;
  
  try {
    const response = await axios.get(
      "https://epic.gsfc.nasa.gov/api/natural"
    );
    const latest = response.data[0];
    const [year, month, day] = latest.date.split(" ")[0].split("-");
    imageUrl = `https://epic.gsfc.nasa.gov/archive/natural/${year}/${month}/${day}/thumbs/${latest.image}.jpg`;
    
    await respond({
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Latest EPIC Earth Image"
          }
        },
        {
          type: "image",
          image_url: imageUrl,
          alt_text: "Earth from EPIC"
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Captured: ${latest.date}`
          }
        }
      ]
    });
  }
  catch (err) {
    console.error(err);
    console.log("imageUrl at error:", imageUrl);
    await respond({ text: "Failed to fetch the latest EPIC Earth image." });
  }
});

//PING

app.command("/vector-ping", async ({ack, respond }) => {
  await ack();
  await respond({ text: "Pong!" });
});

//WEATHER

app.command("/vector-weather", async ({ ack, respond, command }) => {
  await ack();
 
  const city = command.text.trim();
  if (!city) {
    return respond({ text: "Usage: `/vector-weather <city>`" });
  }
 
  try {
    const response = await axios.get(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`
    );
    const current = response.data.current_condition[0];
    const area = response.data.nearest_area[0];
    const areaName = area.areaName[0].value;
    const country = area.country[0].value;
    const desc = current.weatherDesc[0].value;
 
    await respond({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `Weather in ${areaName}, ${country}` }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Condition:* ${desc}` },
            { type: "mrkdwn", text: `*Temperature:* ${current.temp_C}°C / ${current.temp_F}°F` },
            { type: "mrkdwn", text: `*Feels Like:* ${current.FeelsLikeC}°C` },
            { type: "mrkdwn", text: `*Humidity:* ${current.humidity}%` },
            { type: "mrkdwn", text: `*Wind:* ${current.windspeedKmph} km/h` },
            { type: "mrkdwn", text: `*Visibility:* ${current.visibility} km` }
          ]
        }
      ]
    });
  } catch (err) {
    console.error(err);
    await respond({ text: `Couldn't fetch weather for "${city}". Check the city name and try again.` });
  }
});

// DEFINE

app.command("/vector-define", async ({ ack, respond, command }) => {
  await ack();
 
  const word = command.text.trim().toLowerCase();
  if (!word) {
    return respond({ text: "Usage: `/vector-define <word>`" });
  }
 
  try {
    const response = await axios.get(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    const entry = response.data[0];
    const phonetic = entry.phonetic || "";
 
    // Collect up to 3 definitions across all meanings
    const defs = [];
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        defs.push({
          pos: meaning.partOfSpeech,
          definition: def.definition,
          example: def.example
        });
        if (defs.length >= 3) break;
      }
      if (defs.length >= 3) break;
    }
 
    const defText = defs
      .map((d, i) =>
        `${i + 1}. _(${d.pos})_ ${d.definition}${d.example ? `\n   > _"${d.example}"_` : ""}`
      )
      .join("\n\n");
 
    await respond({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: `${entry.word}  ${phonetic}` }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: defText }
        }
      ]
    });
  } catch (err) {
    if (err.response?.status === 404) {
      await respond({ text: `No definition found for "${word}".` });
    } else {
      console.error(err);
      await respond({ text: "Failed to fetch definition." });
    }
  }
});

// JOKE

app.command("/vector-joke", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
    await respond({
      text: `${response.data.setup}\n\n_${response.data.punchline}_`
    });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a joke." });
  }
});

// GITHUB
app.command("/vector-github", async ({ ack, respond, command }) => {
  await ack();

  const username = command.text.trim();
  if (!username) {
    return respond({ text: "Usage: `/vector-github <username>`" });
  }

  const headers = process.env.GITHUB_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
    : {};
  
  try {
    const [userRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, { headers }),
      axios.get(`https://api.github.com/users/${username}/repos?sort=updated&per_page=3`, { headers })
    ]);

    const user = userRes.data;
    const repos = reposRes.data;

    const repoList = repos
      .map(r => `• <${r.html_url}|${r.name}> — ${r.description || "No description"} ⭐ ${r.stargazers_count}`)
      .join("\n");

    await respond({
        blocks: [
          {
            type: "section",
            text: {
            type: "mrkdwn",
            text: `*<${user.html_url}|${user.login}>*${user.name ? ` (${user.name})` : ""}\n${user.bio || "_No bio_"}`
          },
          accessory: {
            type: "image",
            image_url: user.avatar_url,
            alt_text: user.login
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Followers:* ${user.followers}` },
            { type: "mrkdwn", text: `*Following:* ${user.following}` },
            { type: "mrkdwn", text: `*Public Repos:* ${user.public_repos}` },
            { type: "mrkdwn", text: `*Location:* ${user.location || "N/A"}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Recent Repos:*\n${repoList}`
          }
        }
      ]
    });

  } catch (err) {
    if (err.response?.status === 404) {
      await respond({ text: `User \`${username}\` not found on GitHub.` });
    } else {
      console.error(err);
      await respond({ text: "Failed to fetch GitHub profile." });
    }
  }
});

// LEETCODE

app.command("/vector-leetcode", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://alfa-leetcode-api.onrender.com/daily");
    const p = response.data;

    const diffEmoji = { Easy: "🟢", Medium: "🟡", Hard: "🔴" }[p.difficulty] ?? "⚪";
    const tags = p.topicTags.map(t => t.name).join(", ");

    await respond({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "LeetCode Daily Challenge" }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*<${p.questionLink}|${p.questionFrontendId}. ${p.questionTitle}>*\n${diffEmoji} ${p.difficulty}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Topics:* ${tags}`
          }
        }
      ]
    });

  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch today's LeetCode problem. The API might be cold-starting — try again in 30 seconds." });
  }
});

// CAT FACT
app.command("/vector-catfact", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `*Cat Fact:* ${response.data.fact}` });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a cat fact." });
  }
}
);

// HELLO

app.command("/vector-hello", async ({ack, respond}) => {
  await ack();
  await respond({
     text: "Hello! I'm Vector. Try `/vector-help` to see what I can do!"
     });
});


// REMIND

app.command("/vector-remind", async ({ ack, respond, command }) => {
  await ack();

  const match = command.text.match(
    /^"(.+)"\s+(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/
  );

  if (!match) {
    return respond({
      text: 'Usage: `/vector-remind "<message>" YYYY-MM-DD HH:MM`\n_Times are in UTC._'
    });
  }

  const [, message, date, time] = match;
  const remindAt = new Date(`${date}T${time}:00Z`);

  if (isNaN(remindAt.getTime())) {
    return respond({ text: "Invalid date/time format. Please use YYYY-MM-DD for date and HH:MM (24-hour) for time." });
  }

  if (remindAt.getTime() <= Date.now()) {
    return respond({ text: "That time is already in the past. Set a future time (UTC)." });
  }

  const reminder = {
    id: Date.now(),
    user: command.user_id,
    channel: command.channel_id,
    message,
    remindAt: remindAt.toISOString(),
};

let reminders =[];
if(fs.existsSync("./reminders.json")) {
  reminders = JSON.parse(
    fs.readFileSync("./reminders.json", "utf8")
  );
}
reminders.push(reminder);
fs.writeFileSync("./reminders.json", JSON.stringify(reminders, null, 2)
);
await respond({
    text: `Reminder set for *${date} ${time} UTC*\n> ${message}\n_ID: \`${reminder.id}\` — cancel with \`/vector-unremind ${reminder.id}\`_`
  });
});

// LIST REMINDERS

app.command("/vector-reminders", async ({ ack, respond, command }) => {
  await ack();
 
  if (!fs.existsSync("./reminders.json")) {
    return respond({ text: "You have no pending reminders." });
  }
 
  const all = JSON.parse(fs.readFileSync("./reminders.json", "utf8"));
  const yours = all
    .filter(r => r.user === command.user_id && new Date(r.remindAt).getTime() > Date.now())
    .sort((a, b) => new Date(a.remindAt) - new Date(b.remindAt));
 
  if (yours.length === 0) {
    return respond({ text: "You have no pending reminders." });
  }
 
  const list = yours
    .map((r, i) => {
      const dt = r.remindAt.replace("T", " ").replace(":00.000Z", "") + " UTC";
      return `${i + 1}. *${dt}* — ${r.message} (\`/vector-unremind ${r.id}\`)`;
    })
    .join("\n");
 
  await respond({ text: `*Your pending reminders:*\n${list}` });
});

// CANCEL REMINDER

app.command("/vector-unremind", async ({ ack, respond, command }) => {
  await ack();

  const id = parseInt(command.text.trim());
  if (!id) {
    return respond({ text: "Usage: `/vector-unremind <id>` — get IDs from `/vector-reminders`" });
  }
 
  if (!fs.existsSync("./reminders.json")) {
    return respond({ text: "No reminders found." });
  }
 
  let reminders = JSON.parse(fs.readFileSync("./reminders.json", "utf8"));
  const target = reminders.find(r => r.id === id && r.user === command.user_id);
 
  if (!target) {
    return respond({ text: `No reminder with ID \`${id}\` found for you.` });
  }
 
  reminders = reminders.filter(r => r.id !== id);
  fs.writeFileSync("./reminders.json", JSON.stringify(reminders, null, 2));
 
  await respond({ text: `✅ Reminder cancelled: _${target.message}_` });
});

// HELP

app.command("/vector-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`*Vector* — Commands
 
*Utilities*
\`/vector-ping\`                                      - Check if Vector is alive
\`/vector-weather <city>\`                            - Current weather for any city
\`/vector-define <word>\`                             - Dictionary definition
 
*Reminders*
\`/vector-remind "<message>" YYYY-MM-DD HH:MM\`       - Set a reminder (UTC)
\`/vector-reminders\`                                 - List your pending reminders
\`/vector-unremind <id>\`                             - Cancel a reminder
 
*Space*
\`/vector-apod\`                                      - NASA's Astronomy Picture of the Day
\`/vector-earth\`                                     - Latest EPIC Earth image from orbit
 
*Dev*
\`/vector-github <username>\`                         - GitHub profile & recent repos
\`/vector-leetcode\`                                  - Today's LeetCode daily problem

*Fun*
\`/vector-catfact\`                                   - Random cat fact
\`/vector-joke\`                                      - Random joke
\`/vector-hello\`                                     - Say hi
 
\`/vector-about\`                                     - About Vector
\`/vector-help\`                                      - Show this message`
  });
});

// VECTOR ABOUT

app.command("/vector-about", async ({ ack, respond }) => {
  await ack();
  await respond({
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "About Vector" }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Vector* is a Slack bot built for the Hack Club workspace.\n\n*Made by:* <https://github.com/genix2600|Aaryaman>\n*Links:* <https://github.com/genix2600/Vector-slack-bot|GitHub Repo> • <https://stardance.hackclub.com/projects/17377|Stardance Project Link>\n\n_Fun fact: VECTOR stands for Very Efficient Communications, Tracking, Operations, and Reporting._"
        }
      }
    ]
  });
});


// CHECK REMINDERS

async function checkReminders() {
  if (!fs.existsSync("./reminders.json")) return;
 
  let reminders = JSON.parse(fs.readFileSync("./reminders.json", "utf8"));
  const now = Date.now();
 
  const due = reminders.filter(r => new Date(r.remindAt).getTime() <= now);
  const pending = reminders.filter(r => new Date(r.remindAt).getTime() > now);
 
  for (const reminder of due) {
    try {
      await app.client.chat.postMessage({
        channel: reminder.user,
        text: `⏰ *Reminder:* ${reminder.message}`
      });
    } catch (err) {
      console.error(`Failed to send reminder ${reminder.id}:`, err.message);
    }
  }
 
  if (due.length > 0) {
    fs.writeFileSync("./reminders.json", JSON.stringify(pending, null, 2));
    console.log(`Sent ${due.length} reminder(s).`);
  }
}


app.error((error) => {
  console.error("Vector error:", error);
});

(async () => {
  await app.start();
  checkReminders();
  setInterval(checkReminders, 60000);
  console.log("Vector is running!");
})();