import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchFilters } from "features/search/useSearchFilters";
import { Map } from "maplibre-gl";
import { UserSearchRes } from "proto/search_pb";
import { service } from "service";
import users from "test/fixtures/users.json";
import wrapper from "test/hookWrapper";
import { getUser } from "test/serviceMockDefaults";
import {
  assertErrorAlert,
  mockConsoleError,
  MockedService,
  wait,
} from "test/utils";

import SearchResultsList from "./SearchResultsList";

export const mockSearchFiltersFactory = (filters: SearchFilters = {}) => ({
  active: filters,
  change: jest.fn(),
  remove: jest.fn(),
  apply: jest.fn(),
});

const mockHandleResultClick = jest.fn();
jest.mock("maplibre-gl");
const mockMapRef = { current: new Map() };

const getUserMock = service.user.getUser as MockedService<
  typeof service.user.getUser
>;

const userSearchMock = service.search.userSearch as MockedService<
  typeof service.search.userSearch
>;

describe("SearchResultsList", () => {
  it("Shows a user if one is selected with no search query", async () => {
    getUserMock.mockImplementation(getUser);
    render(
      <SearchResultsList
        selectedResult={1}
        handleResultClick={mockHandleResultClick}
        map={mockMapRef}
        searchFilters={mockSearchFiltersFactory()}
      />,
      { wrapper }
    );

    expect(screen.getByRole("progressbar")).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: users[0].name })
    ).toBeVisible();
  });

  it("Is blank with no selection or query", () => {
    render(
      <SearchResultsList
        selectedResult={undefined}
        handleResultClick={mockHandleResultClick}
        map={mockMapRef}
        searchFilters={mockSearchFiltersFactory()}
      />,
      { wrapper }
    );
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
  });

  it("Shows an error if selected user can't be fetched", async () => {
    mockConsoleError();
    getUserMock.mockRejectedValue(new Error("fetch error"));
    render(
      <SearchResultsList
        selectedResult={1}
        handleResultClick={mockHandleResultClick}
        map={mockMapRef}
        searchFilters={mockSearchFiltersFactory()}
      />,
      { wrapper }
    );

    expect(screen.getByRole("progressbar")).toBeVisible();
    await assertErrorAlert("fetch error");
  });

  describe("after searching", () => {
    beforeEach(() => {
      userSearchMock.mockImplementationOnce(async () => {
        await wait(0);
        return {
          resultsList: [{ rank: 1, snippet: "", user: users[0] }],
          nextPageToken: "",
        } as UserSearchRes.AsObject;
      });
      render(
        <SearchResultsList
          handleResultClick={mockHandleResultClick}
          map={mockMapRef}
          searchFilters={mockSearchFiltersFactory({ query: "test query" })}
        />,
        { wrapper }
      );
    });
    it("displays the result", async () => {
      expect(screen.getByRole("progressbar")).toBeVisible();
      await screen.findByRole("heading", { name: users[0].name });
      expect(userSearchMock).toBeCalledWith(
        expect.objectContaining({
          query: "test query",
        }),
        undefined
      );
    });

    it("calls the handler when a result is clicked", async () => {
      const card = await screen.findByRole("button");
      userEvent.click(card);
      expect(mockHandleResultClick).toBeCalledWith(users[0]);
    });
  });

  it("Shows an error if the search fails", async () => {
    mockConsoleError();
    userSearchMock.mockRejectedValueOnce(new Error("search error"));
    render(
      <SearchResultsList
        handleResultClick={mockHandleResultClick}
        map={mockMapRef}
        searchFilters={mockSearchFiltersFactory({ query: "test query" })}
      />,
      { wrapper }
    );
    expect(screen.getByRole("progressbar")).toBeVisible();
    await assertErrorAlert("search error");
  });
});