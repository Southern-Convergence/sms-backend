export default class Applicant {
    static async apply(data) {
        console.log(data);
        return Promise.resolve("Successfully applied");
    }
}
