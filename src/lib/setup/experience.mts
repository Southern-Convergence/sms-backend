import Database from "@lib/database.mjs";

export default async () => {

    const qss = [
        { text: "Knowledge of web architecture" },
        { text: "Databases and web storage" },
        { text: "Programming languages: C#; PHP; Python; Ruby on Rails; HTML; CSS;" },
        { text: "HTTP/HTTPS" }
    ]

    const qs = await Database.collection('qs')?.findOne({});
    if (qs) return;

    const result = await Database.collection('qs')?.insertMany(qss);
    if (!result?.insertedIds) return console.log("[SYSTEM Failed to insert QS");
    return console.log("[SYSTEM] Successfully inserted QS");
}