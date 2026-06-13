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
    await respond({ text: "Failed to fetch a joke." });
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
/vector-ping - Check bot latency
/vector-catfact - Get a cat fact
/vector-joke - Get a random joke
/vector-hello - Says hello!
/vector-apod - Get NASA's Astronomy Picture of the Day
/vector-help - Show this help message`
  });
});

app.error((error) => {
  console.error(error);
});

(async () => {
  await app.start();
  console.log("Vector is running!");
})();