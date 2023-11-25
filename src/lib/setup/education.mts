import Database from "@lib/database.mjs";

export default async () => {

  const qss = [
    { text: "Knowledge of web architecture" },
    { text: "Databases and web storage" },
    { text: "Programming languages: C#; PHP; Python; Ruby on Rails; HTML; CSS;" },
    { text: "HTTP/HTTPS" }
  ]

  const perf_rating = [
    {
      years: 2,
      rating: "satisfactory"
    }
  ]

  const education = await Database.collection('education')?.findOne({});
  if (education) return;

  const result = await Database.collection('education')?.insertMany(qss);
  if (!result?.insertedIds) return console.log("[SYSTEM Failed to insert QS");
  return console.log("[SYSTEM] Successfully inserted QS");
}