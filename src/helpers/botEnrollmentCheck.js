const cron = require("node-cron");
const SchoolYear = require("../models/schoolYearModel");
const Enrollment = require("../models/enrollmentModel");

cron.schedule("59 23 * * *", async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
        const activeSchoolYears = await SchoolYear.find({
            state: "Đang hoạt động",
            active: true
        });

        for (const sy of activeSchoolYears) {
            const endDate = new Date(sy.enrollmentEndDate);
            endDate.setHours(0, 0, 0, 0);

            if (today.getTime() === endDate.getTime()) {

                console.log(`Hôm nay là ngày hết hạn tuyển sinh của ${sy.schoolYear}`);

                const result = await Enrollment.updateMany(
                    {
                        schoolYear: sy._id,
                        state: { $nin: ["Hoàn thành"] }
                    },
                    { $set: { state: "Chưa đủ điều kiện nhập học" } }
                );

                console.log(`Đã cập nhật ${result.modifiedCount} hồ sơ.`);
            }
        }
    } catch (err) {
        console.error("Cron Error:", err);
    }
});

console.log("🚀 Cron job (daily 00:05) đã khởi chạy.");
