const axios = require("axios");
require("dotenv").config();

const { App } = require("@slack/bolt");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

app.command("/vector-apod", async ({ ack, respond }) => {
  await ack();
  try {
    const response = await axios.get(
      `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_API_KEY}`
    );
    const data = response.data;
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
      ],
    });
  }
  catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch NASA's Astronomy Picture of the Day." });
  }
});

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


app.command("/vector-ping", async ({ack, respond }) => {
  const start = Date.now();
  await ack();
  const latency = Date.now() - start;
  await respond({ text: `Pong!\nLatency: ${latency}ms` });
});

app.command("/vector-catfact", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://catfact.ninja/fact");
    await respond({ text: `Cat Fact:\n${response.data.fact}` });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a cat fact." });
  }
});

app.command("/vector-joke", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://official-joke-api.appspot.com/random_joke");
    await respond({
      text:
`${response.data.setup}

${response.data.punchline}`
    });
  } catch (err) {
    console.error(err);
    await respond({ text: "Failed to fetch a joke." });
  }
});

app.command("/vector-github", async ({ ack, respond, command }) => {
  await ack();

  const username = command.text.trim();
  if (!username) {
    await respond({ text: "Usage: `/vector-github <username>`" });
    return;
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


app.command("/vector-leetcode", async ({ ack, respond }) => {
  await ack();

  try {
    const response = await axios.get("https://alfa-leetcode-api.onrender.com/daily");
    const p = response.data;

    const diff = { Easy: "Easy", Medium: "Medium", Hard: "Hard" }[p.difficulty] ?? p.difficulty;
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
            text: `*<${p.questionLink}|${p.questionFrontendId}. ${p.questionTitle}>*\n${diff}`
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
    await respond({ text: "Failed to fetch today's LeetCode problem." });
  }
});


app.command("/vector-hello", async ({ack, respond}) => {
  await ack();

  await respond({
     text: "Hello! I'm Vector, a Slack bot still under development."
     });
});


app.command("/vector-help", async ({ ack, respond }) => {
  await ack();
  await respond({
    text:
`Available Commands:
/vector-ping       - Check bot latency
/vector-hello      - Says hello!
/vector-catfact    - Get a cat fact
/vector-joke       - Get a random joke
/vector-apod       - NASA's Astronomy Picture of the Day
/vector-earth      - Latest EPIC Earth image
/vector-github     - GitHub profile stats
/vector-leetcode   - Today's LeetCode daily problem
/vector-help       - Show this help message`
  });
});

app.error((error) => {
  console.error(error);
});

(async () => {
  await app.start();
  console.log("Vector is running!");
})();