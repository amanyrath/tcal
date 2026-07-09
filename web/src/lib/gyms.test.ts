import { describe, expect, it } from "vitest";
import {
  DEFAULT_GYM_ORDER,
  GYM_REGIONS,
  gymsGroupedByRegion,
  gymLogoUrl,
  moveGymToTop,
  orderGyms,
} from "./gyms";

describe("gymLogoUrl", () => {
  it("returns a public PNG path for each gym key", () => {
    expect(gymLogoUrl("ironworks")).toBe("/gyms/ironworks.png");
    expect(gymLogoUrl("pacific-pipe")).toBe("/gyms/pacific-pipe.png");
  });
});

describe("orderGyms", () => {
  it("uses the persisted gym order", () => {
    const ordered = orderGyms(["dogpatch", "ironworks", ...DEFAULT_GYM_ORDER.slice(2)]);
    expect(ordered.slice(0, 2).map((gym) => gym.key)).toEqual(["dogpatch", "ironworks"]);
    expect(ordered).toHaveLength(17);
  });

  it("returns the default order when none are reordered", () => {
    const ordered = orderGyms(DEFAULT_GYM_ORDER);
    expect(ordered[0].key).toBe("pacific-pipe");
    expect(ordered).toHaveLength(17);
  });
});

describe("moveGymToTop", () => {
  it("moves a gym to the front without changing other positions", () => {
    const next = moveGymToTop(DEFAULT_GYM_ORDER, "ironworks");
    expect(next[0]).toBe("ironworks");
    expect(next.indexOf("pacific-pipe")).toBe(1);
  });

  it("leaves earlier selections in place when another gym is selected", () => {
    const afterIronworks = moveGymToTop(DEFAULT_GYM_ORDER, "ironworks");
    const afterDogpatch = moveGymToTop(afterIronworks, "dogpatch");
    expect(afterDogpatch[0]).toBe("dogpatch");
    expect(afterDogpatch[1]).toBe("ironworks");
  });
});

describe("gymsGroupedByRegion", () => {
  it("groups gyms into Northern and Southern California", () => {
    const grouped = gymsGroupedByRegion(DEFAULT_GYM_ORDER);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].region.label).toBe("Northern California");
    expect(grouped[1].region.label).toBe("Southern California");
    expect(grouped[0].gyms).toHaveLength(10);
    expect(grouped[1].gyms).toHaveLength(7);
  });

  it("covers every gym exactly once", () => {
    const grouped = gymsGroupedByRegion(DEFAULT_GYM_ORDER);
    const keys = grouped.flatMap(({ gyms }) => gyms.map((gym) => gym.key));
    expect(keys).toHaveLength(17);
    expect(new Set(keys).size).toBe(17);
  });

  it("orders gyms within a region by gymOrder", () => {
    const gymOrder = moveGymToTop(DEFAULT_GYM_ORDER, "la-boulders");
    const grouped = gymsGroupedByRegion(gymOrder);
    const socal = grouped.find(({ region }) => region.id === "socal");
    expect(socal?.gyms[0].key).toBe("la-boulders");
  });

  it("keeps a moved gym at the top of its region until another gym is selected", () => {
    const gymOrder = moveGymToTop(DEFAULT_GYM_ORDER, "la-boulders");
    const grouped = gymsGroupedByRegion(gymOrder);
    const socal = grouped.find(({ region }) => region.id === "socal");
    expect(socal?.gyms[0].key).toBe("la-boulders");
    expect(socal?.gyms.map((gym) => gym.key)).toContain("cliffs-of-id");
  });

  it("matches Touchstone region membership", () => {
    const norcal = GYM_REGIONS.find((region) => region.id === "norcal");
    expect(norcal?.keys).toContain("pacific-pipe");
    expect(norcal?.keys).not.toContain("la-boulders");
  });
});
