import { getMockCreep } from "@mock/Creep";

it("全局环境测试", () => {
  // 全局应定义了 Game
  expect(Game).toBeDefined();
  // 全局应定义了 lodash
  expect(_).toBeDefined();
  // 全局的 Memory 应该定义且包含基础的字段
  expect(Memory).toMatchObject({ rooms: {}, creeps: {} });
});

it("mock Creep 可以正常使用", () => {
  // 创建一个 creep 并指定其属性
  const creep = getMockCreep({ name: "test", ticksToLive: 100 });

  expect(creep.name).toBe("test");
  expect(creep.ticksToLive).toBe(100);
});
