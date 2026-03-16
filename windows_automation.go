package main

import (
	"strings"
	"syscall"
	"unsafe"
)

var (
	user32               = syscall.NewLazyDLL("user32.dll")
	procGetForegroundWin = user32.NewProc("GetForegroundWindow")
	procGetWindowTextW   = user32.NewProc("GetWindowTextW")
	procGetWindowTextLen = user32.NewProc("GetWindowTextLengthW")
	procSendInput        = user32.NewProc("SendInput")
	procSetForegroundWin = user32.NewProc("SetForegroundWindow")
	procEnumWindows      = user32.NewProc("EnumWindows")
	procIsWindowVisible  = user32.NewProc("IsWindowVisible")
)

const (
	INPUT_KEYBOARD    = 1
	KEYEVENTF_KEYUP   = 0x0002
	KEYEVENTF_UNICODE = 0x0004
	VK_RETURN         = 0x0D
)

// KEYBDINPUT structure
type KEYBDINPUT struct {
	wVk         uint16
	wScan       uint16
	dwFlags     uint32
	time        uint32
	dwExtraInfo uintptr
}

// INPUT structure for SendInput
type INPUT struct {
	inputType uint32
	ki        KEYBDINPUT
	padding   uint64
}

// System scan result
type WindowBasics struct {
	Title string
	Hwnd  uintptr
}

// Odaklanilan pencerenin basligini cevirir
func getActiveWindowTitle() string {
	hwnd, _, _ := procGetForegroundWin.Call()
	if hwnd == 0 {
		return ""
	}
	return getWindowText(hwnd)
}

func getWindowText(hwnd uintptr) string {
	lenWin, _, _ := procGetWindowTextLen.Call(hwnd)
	if lenWin == 0 {
		return ""
	}

	buf := make([]uint16, lenWin+1)
	procGetWindowTextW.Call(hwnd, uintptr(unsafe.Pointer(&buf[0])), lenWin+1)

	return syscall.UTF16ToString(buf)
}

// Tüm görünür pencereleri tarar ve basliklarini doner
func enumVisibleWindows() []WindowBasics {
	var windows []WindowBasics

	cb := syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		visible, _, _ := procIsWindowVisible.Call(hwnd)
		if visible != 0 {
			title := getWindowText(hwnd)
			if title != "" {
				windows = append(windows, WindowBasics{Title: title, Hwnd: hwnd})
			}
		}
		return 1 // continue enumeration
	})

	procEnumWindows.Call(cb, 0)
	return windows
}

// Bir pencereyi on plana getirir
func EditoruOneGetir(hwnd uintptr) {
	if hwnd != 0 {
		procSetForegroundWin.Call(hwnd)
	}
}

// İstenen kelimeleri içeren bir pencere(ler) (Açık mı) arar ve HWND'si ile döndürür
func findOpenWindow(targetNames []string) (bool, string, uintptr) {
	windows := enumVisibleWindows()
	for _, w := range windows {
		lowerTitle := strings.ToLower(w.Title)
		for _, target := range targetNames {
			if strings.Contains(lowerTitle, strings.ToLower(target)) {
				return true, target, w.Hwnd
			}
		}
	}
	return false, "", 0
}

// sendString simulates keyboard typing of a string.
func sendString(text string) {
	runes := []rune(text)
	var inputs []INPUT

	for _, r := range runes {
		// Key down
		inputs = append(inputs, INPUT{
			inputType: INPUT_KEYBOARD,
			ki: KEYBDINPUT{
				wScan:   uint16(r),
				dwFlags: KEYEVENTF_UNICODE,
			},
		})
		// Key up
		inputs = append(inputs, INPUT{
			inputType: INPUT_KEYBOARD,
			ki: KEYBDINPUT{
				wScan:   uint16(r),
				dwFlags: KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
			},
		})
	}

	sendInputArray(inputs)
}

// sendEnter simulates pressing the Enter key.
func sendEnter() {
	var inputs []INPUT
	inputs = append(inputs, INPUT{
		inputType: INPUT_KEYBOARD,
		ki: KEYBDINPUT{
			wVk: VK_RETURN,
		},
	})
	inputs = append(inputs, INPUT{
		inputType: INPUT_KEYBOARD,
		ki: KEYBDINPUT{
			wVk:     VK_RETURN,
			dwFlags: KEYEVENTF_KEYUP,
		},
	})
	sendInputArray(inputs)
}

func sendInputArray(inputs []INPUT) {
	if len(inputs) == 0 {
		return
	}
	procSendInput.Call(
		uintptr(len(inputs)),
		uintptr(unsafe.Pointer(&inputs[0])),
		uintptr(unsafe.Sizeof(inputs[0])),
	)
}
