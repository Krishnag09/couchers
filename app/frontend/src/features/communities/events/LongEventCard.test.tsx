import { render, screen, within } from "@testing-library/react";
import { service } from "service";
import events from "test/fixtures/events.json";
import users from "test/fixtures/users.json";
import wrapper from "test/hookWrapper";
import { getUser } from "test/serviceMockDefaults";
import timezoneMock from "timezone-mock";

import { ONLINE } from "../constants";
import LongEventCard, { AVATAR_GROUP_TEST_ID } from "./LongEventCard";

const [firstEvent, secondEvent, thirdEvent] = events;
const [currentUser, , user3, user4, user5] = users;

const listEventAttendeesMock = service.events
  .listEventAttendees as jest.MockedFunction<
  typeof service.events.listEventAttendees
>;
const getUserMock = service.user.getUser as jest.MockedFunction<
  typeof service.user.getUser
>;

describe("Long event card", () => {
  beforeEach(() => {
    timezoneMock.register("UTC");
    getUserMock.mockImplementation(getUser);
    listEventAttendeesMock.mockResolvedValue({
      attendeeUserIdsList: [1, 2, 3, 4, 5],
      nextPageToken: "",
    });
  });

  afterEach(() => {
    timezoneMock.unregister();
  });

  it("renders an offline event with the same start and end day correctly", async () => {
    render(<LongEventCard event={firstEvent} />, { wrapper });

    expect(
      screen.getByRole("heading", { name: firstEvent.title })
    ).toBeVisible();
    expect(screen.getByText("Jun 29, 2021")).toBeVisible();
    expect(screen.getByText("2:37 AM to 3:37 AM")).toBeVisible();
    expect(
      screen.getByText(firstEvent.offlineInformation?.address!)
    ).toBeVisible();

    const eventImage = screen.getByRole("img", { name: "" });
    expect(eventImage).toBeVisible();
    expect(eventImage).toHaveAttribute(
      "src",
      "https://loremflickr.com/500/120/amsterdam"
    );

    expect(screen.getByText("10 attendees")).toBeVisible();
    expect(
      await screen.findByRole("img", { name: currentUser.name })
    ).toBeVisible();
    expect(screen.getByText("FD")).toBeVisible();
    expect(screen.getByRole("img", { name: user3.name })).toBeVisible();
    expect(screen.getByText("+7")).toBeVisible();
  });

  it("renders an online event correctly", async () => {
    render(<LongEventCard event={secondEvent} />, { wrapper });

    expect(
      screen.getByRole("heading", { name: secondEvent.title })
    ).toBeVisible();
    expect(screen.getByText("Jun 29, 2021")).toBeVisible();
    expect(screen.getByText("9:00 PM to 10:00 PM")).toBeVisible();

    expect(screen.getByText(ONLINE)).toBeVisible();
  });

  it("renders an event with a different start and end day correctly", async () => {
    listEventAttendeesMock.mockResolvedValue({
      attendeeUserIdsList: [3, 4, 5],
      nextPageToken: "",
    });
    render(<LongEventCard event={thirdEvent} />, { wrapper });

    expect(
      screen.getByRole("heading", { name: thirdEvent.title })
    ).toBeVisible();
    expect(screen.getByText("Jun 29, 2021")).toBeVisible();
    expect(screen.getByText("9:00 PM to Jun 30, 2021 2:00 AM")).toBeVisible();
  });

  it("renders an event with no event image correctly", async () => {
    listEventAttendeesMock.mockResolvedValue({
      attendeeUserIdsList: [3, 4, 5],
      nextPageToken: "",
    });
    render(<LongEventCard event={thirdEvent} />, { wrapper });

    const eventImage = await screen.findByRole("img", { name: "" });
    expect(eventImage).toBeVisible();
    expect(eventImage).toHaveAttribute("src", "eventImagePlaceholder.svg");
  });

  it("renders an event with 3 attendees correctly", async () => {
    listEventAttendeesMock.mockResolvedValue({
      attendeeUserIdsList: [3, 4, 5],
      nextPageToken: "",
    });
    render(<LongEventCard event={thirdEvent} />, { wrapper });

    const avatarGroup = within(await screen.findByTestId(AVATAR_GROUP_TEST_ID));
    expect(avatarGroup.getAllByRole("img")).toHaveLength(3);
    expect(avatarGroup.getByRole("img", { name: user3.name })).toBeVisible();
    expect(avatarGroup.getByRole("img", { name: user4.name })).toBeVisible();
    expect(avatarGroup.getByRole("img", { name: user5.name })).toBeVisible();
    expect(avatarGroup.queryByText(/\+\d/)).not.toBeInTheDocument();
  });

  it("renders an event with fewer than 3 attendees correctly", async () => {
    listEventAttendeesMock.mockResolvedValue({
      attendeeUserIdsList: [4, 5],
      nextPageToken: "",
    });
    render(<LongEventCard event={{ ...thirdEvent, goingCount: 2 }} />, {
      wrapper,
    });

    const avatarGroup = within(await screen.findByTestId(AVATAR_GROUP_TEST_ID));
    expect(avatarGroup.getAllByRole("img")).toHaveLength(2);
    expect(avatarGroup.getByRole("img", { name: user4.name })).toBeVisible();
    expect(avatarGroup.getByRole("img", { name: user5.name })).toBeVisible();
    expect(avatarGroup.queryByText(/\+\d/)).not.toBeInTheDocument();
  });
});
