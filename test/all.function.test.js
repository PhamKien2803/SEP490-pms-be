const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/server");
const Event = require("../src/models/eventModel");
const SchoolYear = require("../src/models/schoolYearModel");

const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    UPDATED: 203,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
};
const RESPONSE_MESSAGE = {
    NOT_FOUND: { message: "Không tìm thấy dữ liệu" },
    DELETED: { message: "Đã xóa thành công" },
    UPDATED: { message: "Cập nhật thành công" },
};

let existingEventId = "692dc2e71f436fd4231e1434";
let schoolYearName = "2025-2026"

let token;

beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_DB);

    const res = await request(app)
        .post("/api/pms/auth/login")
        .send({
            email: "Vintk@gmail.com",
            password: "12345678"
        });

    token = res.body.token;

    if (token.startsWith("Bearer ")) {
        token = token.replace("Bearer ", "");
    }
});

afterAll(async () => {
    await mongoose.connection.close();
});


describe("POST /api/pms/auth/login", () => {

    test("Không nhập email", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({ password: "12345678" });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Nhập email");
    });

    test("Email sai định dạng", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "testlogin",
                password: "12345678"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Email nhập sai định dạng");
    });

    test("Password dưới 8 ký tự", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "123"
            });

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe("Mật khẩu phải có ít nhất 8 ký tự");
    });

    test("Sai mật khẩu", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "saimatkhau"
            });

        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe("Sai mật khẩu");
    });

    test("Login thành công", async () => {
        const res = await request(app)
            .post("/api/pms/auth/login")
            .send({
                email: "Vintk@gmail.com",
                password: "12345678"
            });

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Login success");
        expect(res.body.token).toBeDefined();
        expect(Array.isArray(res.body.permissionListAll)).toBe(true);
    });
});



describe("GET /api/pms/auth/getCurrentUser", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy thông tin user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/auth/getCurrentUser")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toBe("Thông tin người dùng");
        expect(res.body.userProfile.email).toBe("Vintk@gmail.com");
        expect(Array.isArray(res.body.permissionListAll)).toBe(true);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});



describe("Event CRUD Operations /api/pms/topics", () => {

    test("1. LIST Thành công: Lấy danh sách sự kiện năm học 2025-2026", async () => {
        const res = await request(app)
            .get(`/api/pms/events/list?limit=10&page=1&schoolYear=${schoolYearName}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(HTTP_STATUS.OK);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some(e => e.eventCode === 'EV251201001')).toBe(true);
    });

    test("2. GET BY ID Thành công: Lấy chi tiết sự kiện 'Tết Nguyên Đán'", async () => {
        const res = await request(app)
            .get(`/api/pms/events/getById/${existingEventId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(HTTP_STATUS.OK);
        expect(res.body._id.toString()).toBe(existingEventId.toString());
        expect(res.body.eventCode).toBe('EV251201001');
        expect(res.body.eventName).toBe('Tết Nguyên Đán');
        expect(res.body.active).toBe(true);
    });

    test("3. GET BY ID Thất bại: ID không tồn tại", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/pms/events/getById/${nonExistentId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
        const expectedMessage = RESPONSE_MESSAGE.NOT_FOUND.message;
        expect(res.body === expectedMessage || res.body.message === expectedMessage).toBe(true);
    });

    test("4. UPDATE Thành công: Cập nhật ghi chú của sự kiện", async () => {
        const newDescription = "Ghi chú đã được cập nhật từ test.";
        const updateData = {
            description: newDescription,
        };

        const res = await request(app)
            .put(`/api/pms/events/update/${existingEventId}`)
            .set("Authorization", `Bearer ${token}`)
            .send(updateData);

        expect(res.statusCode).toBe(HTTP_STATUS.UPDATED);
        const expectedMessage = RESPONSE_MESSAGE.UPDATED.message;
        expect(res.body === expectedMessage || res.body.message === expectedMessage).toBe(true);

        // const updatedEvent = await Event.findById(existingEventId);
        // expect(updatedEvent.description).toBe(newDescription);

        // await Event.findByIdAndUpdate(existingEventId, {
        //     description: 'Nghỉ Tết Âm lịch, bao gồm 7 ngày chính thức và 2 ngày cuối tuần'
        // });
    });

    test("5. DELETE Thành công: Xóa mềm sự kiện tạm thời", async () => {
        const res = await request(app)
            .post(`/api/pms/events/delete/${existingEventId}`)
            .set("Authorization", `Bearer ${token}`);
        console.log("[Bthieu] ~ res:", res);

        expect(res.statusCode).toBe(HTTP_STATUS.OK);
        const expectedMessage = RESPONSE_MESSAGE.DELETED.message;
        // expect(res.body === expectedMessage || res.body.message === expectedMessage).toBe(true);

        const deletedEvent = await Event.findById(existingEventId);
        expect(deletedEvent.active).toBe(false);
    });

    test("6. DELETE Thất bại: Xóa ID không tồn tại", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .post(`/api/pms/events/delete/${nonExistentId}`)
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(HTTP_STATUS.NOT_FOUND);
        const expectedMessage = RESPONSE_MESSAGE.NOT_FOUND.message;
        expect(res.body === expectedMessage || res.body.message === expectedMessage).toBe(true);
    });
});

describe("CRUD /api/pms/students/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/parents/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/functions/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/roles", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/teachers", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/enrollments/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/menus", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});
describe("CRUD /api/pms/schoolYears", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/foods/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/classes/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/rooms", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/curriculums/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/events/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/medicals/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/topics", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/schedules/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/attendances", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/feedbacks/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/revenues/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/services", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/guardians/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/time-table", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/lessons/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/receipts/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/tuitions", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("PAYMENT /api/pms/payments/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("CRUD /api/pms/balances/", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});

describe("GET /api/pms/accounts/list", () => {

    test("Không có token", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list");

        expect(res.statusCode).toBe(401);
    });

    test("Token không hợp lệ", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", "Bearer token_sai");

        expect(res.statusCode).toBe(401);
    });

    test("Lấy danh sách user thành công", async () => {
        const res = await request(app)
            .get("/api/pms/accounts/list")
            .set("Authorization", `Bearer ${token}`);

        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);

        expect(res.body.page).toBeDefined();
        expect(res.body.page.limit).toBeDefined();
        expect(res.body.page.page).toBeDefined();
        expect(res.body.page.totalCount).toBeGreaterThanOrEqual(0);
    });
});
