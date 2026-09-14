Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")
strScriptPath = WScript.ScriptFullName
strFolder = Left(strScriptPath, InStrRev(strScriptPath, "\"))

shortcutPath = strDesktop & "\نظام كاشير.lnk"

Set oShellLink = WshShell.CreateShortcut(shortcutPath)
oShellLink.TargetPath = strFolder & "افتح البرنامج.bat"
oShellLink.WorkingDirectory = strFolder
oShellLink.WindowStyle = 7
oShellLink.Description = "نظام كاشير"
oShellLink.Save

MsgBox "تم إنشاء اختصار ""نظام كاشير"" على سطح المكتب بنجاح." & vbCrLf & "دبل كليك عليه من هناك لفتح البرنامج.", vbInformation, "تم بنجاح"
