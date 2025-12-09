/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import { bills } from "../fixtures/bills.js"
import Bills from "../containers/Bills.js"
import { ROUTES_PATH} from "../constants/routes.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store.js"
import "@testing-library/jest-dom"
import router from "../app/Router.js"
import { formatDate } from "../app/format.js"

jest.mock("../app/store", () => mockStore)
jest.mock("../app/format.js")

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    // Vérifie l'état de l'icône Bills dans la barre latérale
    it("Should highlight bill icon in vertical layout", async () => {
      Object.defineProperty(window, "localStorage", { value: localStorageMock })
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee" }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId("icon-window"))
      const windowIcon = screen.getByTestId("icon-window")
      expect(windowIcon.classList.contains("active-icon")).toBeTruthy()
    })

    // Vérifie que les factures sont triées par date décroissante
    it("Should sort bills from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen
        .getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i)
        .map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })
  })

  describe("When I click on the eye icon", () => {
    // Vérifie l'ouverture de la modale avec l'image de la facture
    it("Should open a modal", () => {
      const document = {
        querySelector: jest.fn().mockReturnValue({ getAttribute: jest.fn(), addEventListener: jest.fn() }),
        querySelectorAll: jest.fn().mockReturnValue([{ click: jest.fn(), getAttribute: jest.fn(), addEventListener: jest.fn() }]),
      }
      const onNavigate = jest.fn()
      const store = null
      const localStorage = window.localStorage
      const bills = new Bills({ document, onNavigate, store, localStorage })
      const handleClickIconEye = jest.spyOn(bills, "handleClickIconEye")
      const iconEye = document.querySelector(`div[data-testid="icon-eye"]`)
      const modalMock = jest.fn()
      $.fn.modal = modalMock
      bills.handleClickIconEye(iconEye)
      expect(handleClickIconEye).toHaveBeenCalled()
      expect(modalMock).toHaveBeenCalled()
    })
  })

  describe("When I click on the button to create a new bill", () => {
    // Vérifie la navigation vers la page NewBill
    it("Should call the onNavigate function with the 'NewBill' route", () => {
      const onNavigate = jest.fn()
      const document = { querySelector: jest.fn(), querySelectorAll: jest.fn() }
      const localStorage = window.localStorage
      const store = null
      const bills = new Bills({ document, onNavigate, store, localStorage })
      bills.handleClickNewBill()
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["NewBill"])
    })
  })

  describe("API Error handling and getBills", () => {
    // Vérifie le rendu des erreurs API et le comportement de getBills
    it("Should fetch bills from an API and fails with 404 message error", async () => {
      jest.spyOn(mockStore, "bills")
      Object.defineProperty(window, "localStorage", { value: localStorageMock })
      window.localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "employee@example.com" }))
      document.body.innerHTML = `<div id="root"></div>`
      router()
      mockStore.bills.mockImplementationOnce(() => ({ list: () => Promise.reject(new Error("Erreur 404")) }))
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    it("Should fetch bills from an API and fails with 500 message error", async () => {
      mockStore.bills.mockImplementationOnce(() => ({ list: () => Promise.reject(new Error("Erreur 500")) }))
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 500/)
      expect(message).toBeTruthy()
    })

    it("Should log an error and return unformatted date when formatDate throws an error", async () => {
      const mockStoreLocal = { bills: jest.fn().mockReturnValue({ list: jest.fn().mockResolvedValue([{ date: "2022-01-01", status: "pending" }]) }) }
      const consoleLogSpy = jest.spyOn(console, "log")
      formatDate.mockImplementationOnce(() => { throw new Error("formatDate error") })
      document.body.innerHTML = `<div id="root"></div>`
      const bills = new Bills({ document, onNavigate: () => {}, store: mockStoreLocal, localStorage: window.localStorage })
      await bills.getBills()
      expect(consoleLogSpy).toHaveBeenCalledWith(new Error("formatDate error"), "for", { date: "2022-01-01", status: "pending" })
    })
  })
})







