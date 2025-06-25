# Goldcast Selector

A Chrome extension that automatically selects registrants from a list of email addresses on Goldcast event pages. Save time on bulk registrant selection with automated email matching and checkbox selection across multiple pages.

<img width="451" alt="image" src="https://github.com/user-attachments/assets/ed6bc584-a48a-44ee-b561-833bef2a40db" />

## ✨ Features

- **Smart Email Detection**: Automatically finds email addresses on Goldcast registrant pages
- **Bulk Selection**: Matches emails against your provided list and checks corresponding checkboxes
- **Multi-page Processing**: Automatically navigates through all pages using pagination
- **Real-time Progress**: Shows live progress updates and match counts
- **Persistent Storage**: Saves your email list between browser sessions

## 💾 Installation

1. Download the repository as a ZIP file
2. Extract the ZIP file to a folder on your computer
3. Open your browser and navigate to the extensions page:
     - **Chrome**: `chrome://extensions/`
     - **Edge**: `edge://extensions/`
     - **Brave**: `brave://extensions/`
     - **Opera**: `opera://extensions/`
4. Enable "Developer mode" by toggling the switch, then click "Load unpacked" button and select the extracted extension folder
5. The extension icon should appear in your browser toolbar

### 🚀 Usage
1. **Navigate** to a Goldcast event registrants page:
   ```
   https://admin.goldcast.io/events/[event-id]/registration-new/registrants
   ```

2. **Click** the extension icon in your toolbar

3. **Enter** your email addresses (one per line) in the text area

4. **Click** "Start Matching"

5. **Watch** as the extension automatically:
   - Finds matching emails on the current page
   - Checks the corresponding checkboxes
   - Navigates to the next page
   - Repeats until all pages are processed

## 📁 File Structure

- `manifest.json` - Extension configuration and permissions
- `popup.html` - Clean, modern user interface
- `popup.js` - User interaction and messaging logic
- `content.js` - Core email matching and checkbox automation
- `icon*.png` - Extension icons (16px, 48px, 128px)

## ⚙️ How It Works

The extension uses sophisticated DOM parsing to:

1. **Email Detection**: Targets `<p class="tw-max-w-[300px] tw-truncate">` elements containing email addresses
2. **Checkbox Mapping**: Locates corresponding checkboxes with IDs like `select-registrant-checkbox-*`
3. **Visibility Handling**: Makes hidden checkboxes visible before clicking them
4. **Pagination**: Uses the "Next" button (`#next-button`) for automatic page navigation
5. **Progress Tracking**: Parses pagination text (e.g., "1 – 15 of 287") to show accurate progress

## 🎯 Supported Pages

Works exclusively on Goldcast registrant pages with URL pattern:
```
https://admin.goldcast.io/events/*/registration-new/registrants*
```

## 🔐 Permissions

- `activeTab` - Access to the current Goldcast tab
- `storage` - Save email lists between sessions
- `https://admin.goldcast.io/*` - Access to Goldcast admin interface

## 📧 Email Format

Simply paste your emails one per line:
```
john.doe@company.com
jane.smith@company.com
admin@organization.org
```

No special formatting required - the extension handles validation automatically.

## 🛠️ Troubleshooting

**Extension not responding?**
- Ensure you're on a Goldcast registrants page
- Check that the extension is enabled in `chrome://extensions/`
- Look for status messages in the extension popup

**No matches found?**
- Verify your email format (one per line)
- Check browser console (F12) for detailed logs
- Ensure emails exist on the current Goldcast event

**Stopped mid-process?**
- Click "Stop" then "Start Matching" to restart
- Refresh the page and try again
- Check if you've reached the last page
