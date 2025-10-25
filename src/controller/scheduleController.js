const { HTTP_STATUS } = require('../constants/useConstants');
const Activity = require("../models/activityModel");
const SchoolYear = require("../models/schoolYearModel");
const Topic = require("../models/topicModel");
const Event = require("../models/eventModel");
const Schedule = require("../models/scheduleModel");
const ClassModel = require("../models/classModel");
const { default: mongoose } = require('mongoose');

const getDaysInMonth = (year, month) => {
  const numDays = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = 1; day <= numDays; day++) {
    days.push(new Date(year, month - 1, day));
  }
  return days;
};

const getDayName = (date) => {
  const day = date.getDay();
  if (day === 0) return "Chủ nhật";
  return `Thứ ${day + 1}`;
};

const findAvailableSlot = (occupied, duration, minTime, maxTime) => {
  const sorted = occupied.sort((a, b) => a.start - b.start);
  let lastEnd = minTime;
  for (const slot of sorted) {
    if (slot.start - lastEnd >= duration) return { start: lastEnd, end: lastEnd + duration };
    lastEnd = Math.max(lastEnd, slot.end);
  }
  if (maxTime - lastEnd >= duration) return { start: lastEnd, end: lastEnd + duration };
  return null;
};

const shuffleArray = (array) => array.sort(() => Math.random() - 0.5);

const splitWeeks = (days) => {
  const weeks = [];
  let week = [];
  days.forEach((date) => {
    week.push(date);
    if (date.getDay() === 0) {
      weeks.push(week);
      week = [];
    }
  });
  if (week.length > 0) weeks.push(week);
  return weeks;
};

// exports.createScheduleController = async (req, res) => {
//   try {
//     const { year, month, age } = req.body;
//     if (!year || !month || !age)
//       return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Yêu cầu nhập năm, tháng, tuổi" });

//     const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
//     if (!dataSchoolYear)
//       return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học đang hoạt động" });

//     const dataTopic = await Topic.findOne({ active: true, schoolYear: dataSchoolYear._id, age, month })
//       .populate("activitiFix.activity")
//       .populate("activitiCore.activity")
//       .populate("activitiEvent.activity");

//     if (!dataTopic)
//       return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy chủ đề tháng" });

//     const activityFix = dataTopic.activitiFix;
//     const activitiEvent = dataTopic.activitiEvent;
//     const activityCore = dataTopic.activitiCore;

//     const classes = await ClassModel.find({ age, active: true, schoolYear: dataSchoolYear._id });
//     const allDays = getDaysInMonth(year, month);
//     const weeks = splitWeeks(allDays);

//     const eventList = await Event.find({ active: true, schoolYear: dataSchoolYear._id });
//     const holidayDates = [];
//     eventList.filter(e => e.isHoliday).forEach(ev => {
//       if (ev.holidayStartDate && ev.holidayEndDate) {
//         let d = new Date(ev.holidayStartDate);
//         const end = new Date(ev.holidayEndDate);
//         while (d <= end) {
//           holidayDates.push(d.toISOString().split("T")[0]);
//           d.setDate(d.getDate() + 1);
//         }
//       }
//     });

//     const categoriesMorning = ["Phát triển nhận thức"];
//     const categoriesAfternoon = ["Phát triển thể chất"];
//     const categoriesOther = ["Phát triển ngôn ngữ", "Phát triển tình cảm", "Phát triển thẩm mỹ", "Phát triển kỹ năng xã hội"];

//     const schedulesToInsert = [];

//     for (const cls of classes) {
//       const scheduleDays = allDays.map(date => {
//         const isHoliday = holidayDates.includes(date.toISOString().split("T")[0]) || date.getDay() === 0;
//         return {
//           date,
//           dayName: getDayName(date),
//           activities: isHoliday ? [] : activityFix.map(item => ({
//             activity: item.activity._id,
//             activityName: item.activity.activityName,
//             type: "Cố định",
//             startTime: item.activity.startTime,
//             endTime: item.activity.endTime,
//           })),
//           isHoliday,
//           notes: ""
//         };
//       });

//       // Thêm sự kiện
//       const mappedEvents = activitiEvent.map(evAct => {
//         const matchEvent = eventList.find(e => e.eventName === evAct.activity.eventName);
//         if (matchEvent) {
//           return {
//             activity: evAct.activity,
//             sessionsPerWeek: evAct.sessionsPerWeek || 1,
//             holidayStartDate: matchEvent.holidayStartDate,
//             holidayEndDate: matchEvent.holidayEndDate
//           };
//         }
//         return null;
//       }).filter(Boolean);

//       mappedEvents.forEach(ev => {
//         if (!ev.holidayStartDate || !ev.holidayEndDate) return;

//         let currentDate = new Date(ev.holidayStartDate);
//         const endDate = new Date(ev.holidayEndDate);

//         while (currentDate <= endDate) {
//           const dateStr = currentDate.toISOString().split("T")[0];
//           let target = scheduleDays.find(sch => sch.date.toISOString().split("T")[0] === dateStr && !sch.isHoliday);

//           if (!target) {
//             // lùi ngày
//             let prevDate = new Date(currentDate);
//             do {
//               prevDate.setDate(prevDate.getDate() - 1);
//               const prevStr = prevDate.toISOString().split("T")[0];
//               target = scheduleDays.find(sch => sch.date.toISOString().split("T")[0] === prevStr && !sch.isHoliday);
//             } while (!target && prevDate >= scheduleDays[0].date);
//             if (!target) { currentDate.setDate(currentDate.getDate() + 1); continue; }
//           }

//           const occupied = target.activities
//             .filter(a => a.startTime && a.endTime)
//             .map(a => ({ start: a.startTime, end: a.endTime }));

//           for (let i = 0; i < ev.sessionsPerWeek; i++) {
//             const slot = findAvailableSlot(occupied, 30, 435, 1050);
//             if (!slot) break;
//             target.activities.push({
//               activity: ev.activity._id,
//               activityName: ev.activity.activityName,
//               startTime: slot.start,
//               endTime: slot.end,
//               type: "Sự kiện"
//             });
//             occupied.push(slot);
//           }
//           currentDate.setDate(currentDate.getDate() + 1);
//         }
//       });

//       // Chia lịch theo tuần
//       weeks.forEach(weekDays => {
//         // Shuffle ngày trong tuần để tạo lịch khác nhau
//         const shuffledWeek = shuffleArray(weekDays.map(d => scheduleDays.find(s => s.date.toISOString() === d.toISOString())));

//         const fillActivities = (categories) => {
//           categories.forEach(cat => {
//             const acts = shuffleArray(activityCore.filter(a => a.activity.category === cat));
//             acts.forEach(act => {
//               let count = act.sessionsPerWeek || 1;
//               let i = 0;
//               while (count > 0 && i < shuffledWeek.length) {
//                 const day = shuffledWeek[i];
//                 if (day.isHoliday) { i++; continue; }
//                 const occupied = day.activities
//                   .filter(a => a.startTime && a.endTime)
//                   .map(a => ({ start: a.startTime, end: a.endTime }));
//                 let minTime, maxTime;
//                 if (categoriesMorning.includes(cat)) { minTime = 435; maxTime = 690; }
//                 else if (categoriesAfternoon.includes(cat)) { minTime = 810; maxTime = 1050; }
//                 else { minTime = 435; maxTime = 1050; }

//                 const slot = findAvailableSlot(occupied, 30, minTime, maxTime);
//                 if (slot) {
//                   day.activities.push({
//                     activity: act.activity._id,
//                     activityName: act.activity.activityName,
//                     startTime: slot.start,
//                     endTime: slot.end,
//                     type: "Bình thường",
//                     category: cat
//                   });
//                   count--;
//                 }
//                 i++;
//               }
//             });
//           });
//         };

//         fillActivities(categoriesMorning);
//         fillActivities(categoriesAfternoon);
//         fillActivities(categoriesOther);
//       });

//       scheduleDays.forEach(day => day.activities.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)));

//       schedulesToInsert.push({
//         schoolYear: dataSchoolYear._id,
//         class: cls._id,
//         month,
//         scheduleDays,
//         status: "Dự thảo"
//       });
//     }


//     await Schedule.insertMany(schedulesToInsert);

//     return res.status(HTTP_STATUS.OK).json({
//       message: "Lịch đã được tạo thành công",
//       schedules: schedulesToInsert
//     });
//   } catch (error) {
//     console.error("Error createScheduleController", error);
//     return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
//   }
// };

exports.getByIdController = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate({ path: "schoolYear", select: "schoolYearCode schoolYear" })
      .populate({ path: "class", select: "classCode className" })
      .populate("scheduleDays.activities.activity");

    if (!schedule)
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lịch" });

    const formattedSchedule = schedule.scheduleDays.map(day => ({
      date: day.date,
      dayName: day.dayName,
      isHoliday: day.isHoliday,
      notes: day.notes,
      activities: (day.activities || [])
        .map(a => {
          const act = a.activity || {}; 
          return {
            activityCode: act.activityCode,
            activityName: act.activityName,
            type: act.type,
            startTime: a.startTime || null,
            endTime: a.endTime || null,
            _id: a._id || null
          };
        })
        .sort((x, y) => {
          if (!x.startTime || !y.startTime) return 0;
          return x.startTime - y.startTime;
        })
    }));

    const newObject = {
      _id: schedule._id,
      schoolYear: schedule.schoolYear.schoolYear,
      className: schedule.class.className,
      status: schedule.status,
      scheduleDays: formattedSchedule,
    }

    return res.status(HTTP_STATUS.OK).json(newObject);
  } catch (error) {
    console.log("Error getByIdController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};


exports.getByParamsController = async (req, res) => {
  try {
    const { schoolYear: schoolYearString, class: classId, month } = req.query;

    if (!schoolYearString || !classId || !month) {
      return res.status(400).json({
        message: "Thiếu tham số schoolYear, class hoặc month",
      });
    }

    const targetMonth = parseInt(month);
    if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ message: "Giá trị tháng không hợp lệ" });
    }

    const schoolYearDoc = await SchoolYear.findOne({
      schoolYear: { $regex: '^' + schoolYearString }
    });

    if (!schoolYearDoc) {
      return res
        .status(404)
        .json({ message: `Không tìm thấy năm học nào bắt đầu bằng ${schoolYearString}` });
    }
    const schedule = await Schedule.findOne({
      schoolYear: schoolYearDoc._id,
      class: new mongoose.Types.ObjectId(classId),
      month: targetMonth,
    })
      .populate({ path: "schoolYear", select: "schoolYear schoolYearCode" })
      .populate({ path: "class", select: "classCode className" })
      .populate("scheduleDays.activities.activity");

    if (!schedule) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy lịch học phù hợp" });
    }

    const formattedSchedule = (schedule.scheduleDays || []).map((day) => ({
      date: day.date,
      dayName: day.dayName,
      schoolYear: schedule.schoolYear
        ? {
          _id: schedule.schoolYear._id,
          schoolYear: schedule.schoolYear.schoolYear,
        }
        : null,
      class: schedule.class
        ? {
          _id: schedule.class._id,
          className: schedule.class.className,
        }
        : null,
      isHoliday: day.isHoliday,
      notes: day.notes,
      activities: (day.activities || [])
        .filter((a) => a.activity)
        .map((a) => ({
          activityCode: a.activity.activityCode,
          activityName: a.activity.activityName,
          type: a.activity.type,
          startTime: a.startTime,
          endTime: a.endTime,
          _id: a._id,
        }))
        .sort((x, y) => x.startTime - y.startTime),
      status: schedule.status,
    }));

 const newObject = {
      _id: schedule._id,
      schoolYear: schedule.schoolYear.schoolYear,
      className: schedule.class.className,
      status: schedule.status,
      scheduleDays: formattedSchedule,
    }
    return res.status(200).json(newObject);
  } catch (error) {
    console.error("Error getByParamsController:", error);
    return res.status(500).json({
      message: "Lỗi máy chủ",
      error: error.message || error,
    });
  }
};

exports.previewScheduleController = async (req, res) => {
  try {
    const { year, month, classId } = req.query;
    if (!year || !month || !classId)
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Yêu cầu nhập năm, tháng, lớp học" });

    const cls = await ClassModel.findById(classId);
    if (!cls) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp học" });

    const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
    if (!dataSchoolYear) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học đang hoạt động" });

    const dataTopic = await Topic.findOne({ active: true, schoolYear: dataSchoolYear._id, age: cls.age, month })
      .populate("activitiFix.activity")
      .populate("activitiCore.activity")
      .populate("activitiEvent.activity");

    if (!dataTopic) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy chủ đề tháng" });

    const { activitiFix: activityFix, activitiCore: activityCore, activitiEvent } = dataTopic;

    const allDays = getDaysInMonth(year, month);
    const weeks = splitWeeks(allDays);

    const eventList = await Event.find({ active: true, schoolYear: dataSchoolYear._id });
    const holidayDates = [];
    eventList.filter(e => e.isHoliday).forEach(ev => {
      if (ev.holidayStartDate && ev.holidayEndDate) {
        let d = new Date(ev.holidayStartDate);
        const end = new Date(ev.holidayEndDate);
        while (d <= end) {
          const dateStr = d.toISOString().split("T")[0];
          if (!holidayDates.includes(dateStr)) holidayDates.push(dateStr);
          d.setDate(d.getDate() + 1);
        }
      }
    });

    const categoriesMorning = ["Phát triển nhận thức"];
    const categoriesAfternoon = ["Phát triển thể chất"];
    const categoriesOther = ["Phát triển ngôn ngữ", "Phát triển tình cảm", "Phát triển thẩm mỹ", "Phát triển kỹ năng xã hội"];

    const scheduleDays = allDays.map(date => {
      const dateStr = date.toISOString().split("T")[0];
      const isOfficialHoliday = holidayDates.includes(dateStr);
      const isSunday = date.getDay() === 0;

      let activities = [];
      if (!isOfficialHoliday && !isSunday && Array.isArray(activityFix)) {
        activityFix.forEach(item => {
          if (item.activity && item.activity._id) {
            activities.push({
              activity: item.activity._id,
              activityName: item.activity.activityName,
              type: "Cố định",
              startTime: item.activity.startTime,
              endTime: item.activity.endTime
            });
          }
        });
      }

      return {
        date,
        dayName: getDayName(date),
        activities,
        isHoliday: isOfficialHoliday,
        notes: ""
      };
    });

    if (activitiEvent.length > 0) {
      const mappedEvents = activitiEvent.map(evAct => {
        const matchEvent = eventList.find(e => e.eventName === evAct.activity.eventName);
        if (matchEvent) {
          return {
            activity: evAct.activity,
            sessionsPerWeek: evAct.sessionsPerWeek || 1,
            holidayStartDate: matchEvent.holidayStartDate,
            holidayEndDate: matchEvent.holidayEndDate
          };
        }
        return null;
      }).filter(Boolean);

      mappedEvents.forEach(ev => {
        if (!ev.holidayStartDate || !ev.holidayEndDate) return;
        let currentDate = new Date(ev.holidayStartDate);
        const endDate = new Date(ev.holidayEndDate);

        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split("T")[0];
          const target = scheduleDays.find(d => d.date.toISOString().split("T")[0] === dateStr && !d.isHoliday && d.dayName !== "Chủ nhật");
          if (!target) { currentDate.setDate(currentDate.getDate() + 1); continue; }

          const occupied = target.activities.map(a => ({ start: a.startTime, end: a.endTime }));
          for (let i = 0; i < ev.sessionsPerWeek; i++) {
            const slot = findAvailableSlot(occupied, 30, 435, 1050);
            if (!slot) break;
            target.activities.push({
              activity: ev.activity._id,
              activityName: ev.activity.activityName,
              startTime: slot.start,
              endTime: slot.end,
              type: "Sự kiện"
            });
            occupied.push(slot);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      });
    }

    weeks.forEach(weekDays => {
      const normalDays = weekDays
        .map(d => scheduleDays.find(s => s.date.toISOString().split("T")[0] === d.toISOString().split("T")[0]))
        .filter(d => !d.isHoliday && d.dayName !== "Chủ nhật");

      const fillActivities = (categories) => {
        categories.forEach(cat => {
          const acts = activityCore.filter(a => a.activity && a.activity._id && a.activity.category === cat);
          if (acts.length === 0) return;

          acts.forEach(act => {
            const id = act.activity._id.toString();
            const maxSessions = act.sessionsPerWeek || 1;

            const availableDays = normalDays.filter(d =>
              !d.activities.some(a => a.activityName === act.activity.activityName)
            );

            const sessionsToAdd = Math.min(maxSessions, availableDays.length);

            const step = Math.floor(availableDays.length / sessionsToAdd) || 1;

            for (let i = 0; i < sessionsToAdd; i++) {
              const day = availableDays[i * step];
              const occupied = day.activities.map(a => ({ start: a.startTime, end: a.endTime }));
              const slot = findAvailableSlot(occupied, 30, 435, 1050);
              if (!slot) continue;

              day.activities.push({
                activity: act.activity._id,
                activityName: act.activity.activityName,
                startTime: slot.start,
                endTime: slot.end,
                type: "Bình thường",
                category: cat
              });
            }
          });
        });
      };

      fillActivities(categoriesMorning);
      fillActivities(categoriesAfternoon);
      fillActivities(categoriesOther);
    });

    scheduleDays.forEach(day => day.activities.sort((a, b) => (a.startTime || 0) - (b.startTime || 0)));

    return res.status(HTTP_STATUS.OK).json({
      message: "Xem trước lịch thành công",
      schedule: {
        schoolYear: dataSchoolYear._id,
        class: cls._id,
        month,
        scheduleDays
      }
    });

  } catch (error) {
    console.error("Error previewScheduleController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};


exports.getListActivityFixController = async (req, res) => {
  try {
    const { year, month, classId } = req.query;
    if (!year || !month || !classId)
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Yêu cầu nhập năm, tháng, lớp học" });

    const cls = await ClassModel.findById(classId);
    if (!cls) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy lớp học" });

    const dataSchoolYear = await SchoolYear.findOne({ active: true, state: "Đang hoạt động" });
    if (!dataSchoolYear) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy năm học đang hoạt động" });

    const dataTopic = await Topic.findOne({
      active: true,
      schoolYear: dataSchoolYear._id,
      age: cls.age,
      month
    }).populate("activitiFix.activity");

    if (!dataTopic) return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy chủ đề tháng" });

    const activityFix = dataTopic.activitiFix || [];

    const eventList = await Event.find({ active: true, schoolYear: dataSchoolYear._id });
    const allDays = getDaysInMonth(year, month);

    const holidayDates = [];
    eventList.filter(e => e.isHoliday).forEach(ev => {
      if (ev.holidayStartDate && ev.holidayEndDate) {
        let d = new Date(ev.holidayStartDate);
        const end = new Date(ev.holidayEndDate);
        while (d <= end) {
          const dateStr = d.toISOString().split("T")[0];
          if (!holidayDates.includes(dateStr)) holidayDates.push(dateStr);
          d.setDate(d.getDate() + 1);
        }
      }
    });

    const getFreeSlots = (activities, minTime = 435, maxTime = 1050, duration = 30) => {
      const occupied = activities
        .filter(a => a.startTime && a.endTime)
        .map(a => ({ start: a.startTime, end: a.endTime }));

      const freeSlots = [];
      let slot = findAvailableSlot(occupied, duration, minTime, maxTime);
      while (slot) {
        freeSlots.push({ startTime: slot.start, endTime: slot.end });
        occupied.push(slot);
        slot = findAvailableSlot(occupied, duration, minTime, maxTime);
      }
      return freeSlots;
    };

    const mergeActivitiesAndFreeSlots = (activities, freeSlots) => {
      const freeActivities = freeSlots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime
      }));
      return [...activities, ...freeActivities].sort((a, b) => a.startTime - b.startTime);
    };

    const scheduleDays = allDays.map(date => {
      const dateStr = date.toISOString().split("T")[0];
      const isOfficialHoliday = holidayDates.includes(dateStr);
      const isSunday = date.getDay() === 0;

      let activities = [];
      if (!isOfficialHoliday && !isSunday && Array.isArray(activityFix)) {
        activities = activityFix
          .filter(item => item.activity && item.activity._id)
          .map(item => ({
            activity: item.activity._id,
            activityName: item.activity.activityName,
            type: "Cố định",
            startTime: item.activity.startTime,
            endTime: item.activity.endTime
          }));
      }
      const freeSlots = (!isSunday && !isOfficialHoliday) ? getFreeSlots(activities) : [];

      const mergedActivities = mergeActivitiesAndFreeSlots(activities, freeSlots);

      return {
        date,
        dayName: getDayName(date),
        activities: mergedActivities,
        isHoliday: isOfficialHoliday,
        notes: ""
      };
    });

    return res.status(HTTP_STATUS.OK).json(scheduleDays);
  } catch (error) {
    console.error("error getListActivityFixController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json({
      message: "Lỗi máy chủ",
      error: error.message
    });
  }
};



exports.createScheduleController = async (req, res) => {
  try {
    const { class: classId, month, scheduleDays } = req.body;
    if (!classId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Vui lòng chọn lớp học" });
    }
    if (!month) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Vui lòng chọn tháng học" });
    }

    if (!scheduleDays || scheduleDays.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Vui lòng nhập đủ lịch học" });
    }

    const checkSchoolYear = await SchoolYear.findOne({
      active: { $eq: true },
      state: "Đang hoạt động"
    });

    const checkSchedule = await Schedule.findOne({
      month: month,
      class: classId,
      schoolYear: checkSchoolYear._id
    });

    if (checkSchedule) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Lịch học tháng này đã được tạo" });
    }

    const newObject = await new Schedule({
      schoolYear: checkSchoolYear._id,
      class: classId,
      month: month,
      scheduleDays,
      status: "Dự thảo"
    });

    await newObject.save();

    return res.status(HTTP_STATUS.OK).json({ message: "Thêm mới thành công lịch học" });
  } catch (error) {
    console.log("error getListActivityFixController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};

exports.getListAvailableController = async (req, res) => {
  try {
    // const { class: classId, month } = req.query;
    const { classId, month } = req.query;
    if (!classId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Vui lòng chọn lớp học" });
    }

    if (!month) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Vui lòng chọn tháng học" });
    }

    const dataSchoolYear = await SchoolYear.findOne({
      active: true,
      state: "Đang hoạt động"
    }).lean();

    if (!dataSchoolYear) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Không tìm thấy năm học đang hoạt động" });
    }

    const dataClass = await ClassModel.findById(classId).lean();

    if (!dataClass) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: "Không tìm thấy lớp học" });
    }

    const topic = await Topic.findOne(
      {
        schoolYear: dataSchoolYear._id,
        month,
        age: dataClass.age
      },
      {
        activitiCore: 1,
        activitiEvent: 1
      }
    )
      .populate("activitiCore.activity", "activityCode activityName type category")
      .populate("activitiEvent.activity", "activityCode activityName type eventName")
      .lean();

    if (!topic) {
      return res.status(HTTP_STATUS.OK).json([]);
    }

    const coreActivities =
      topic.activitiCore?.map((item) => ({
        _id: item.activity?._id,
        activityCode: item.activity?.activityCode,
        activityName: item.activity?.activityName,
        type: item.activity?.type,
        category: item.activity?.category || null,
        eventName: null
      })) || [];

    const eventActivities =
      topic.activitiEvent?.map((item) => ({
        _id: item.activity?._id,
        activityCode: item.activity?.activityCode,
        activityName: item.activity?.activityName,
        type: item.activity?.type,
        category: null,
        eventName: item.activity?.eventName || null
      })) || [];

    const allActivities = [...coreActivities, ...eventActivities];

    return res.status(HTTP_STATUS.OK).json(allActivities);
  } catch (error) {
    console.log("error getListAvailableController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
};


exports.confirmScheduleController = async (req, res) => {
  try {
    const data = await Schedule.findById(req.params.id);
    if (!data) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Không tìm thấy dữ liệu lịch học" });
    }
    data.status = "Xác nhận";
    data.save();
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    console.log("error getListAvailableController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}


exports.getClassBySchoolYearController = async (req, res) => {
  try {
    const dataSchoolYear = await SchoolYear.findOne({
      active: { $eq: true },
      state: "Đang hoạt động"
    });
    const dataClass = await ClassModel.find({
      schoolYear: dataSchoolYear._id,
      active: { $eq: true }
    }, {
      classCode: 1,
      className: 1
    }).lean();

    return res.status(HTTP_STATUS.OK).json(dataClass);
  } catch (error) {
    console.log("error getClassBySchoolYear", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}

exports.updateScheduleController = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Schedule.findById(id);
    if (!data) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(RESPONSE_MESSAGE.NOT_FOUND);
    }
    Object.assign(data, req.body);

    const uniqueFields = Object.keys(Schedule.schema.paths).filter(
      key => Schedule.schema.paths[key].options.unique
    );

    for (const field of uniqueFields) {
      const exists = await Schedule.findOne({ [field]: data[field], _id: { $ne: id } });
      if (exists) {
        return res.status(400).json({ message: `Trường ${field} đã tồn tại.` });
      }
    }
    const schoolYearData = await SchoolYear.findOne({
      active: {$eq: true},
      state: "Đang hoạt động"
    })
    data.schoolYear = schoolYearData._id;
    await data.save();

    return res.status(HTTP_STATUS.UPDATED).json(RESPONSE_MESSAGE.UPDATED);
  } catch (error) {
    console.log("error updateScheduleController", error);
    return res.status(HTTP_STATUS.SERVER_ERROR).json(error);
  }
}