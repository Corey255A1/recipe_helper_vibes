#!/usr/bin/env python3
"""
Firefox Marionette Screenshot Capture Tool for Recipe Helper
Captures Desktop, Tablet, and Mobile viewport screenshots across all main views & modals.
"""

import os
import sys
import time
import json
import base64
import socket
import subprocess
import shutil

PORT = 2828
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "screenshots")
ARTIFACT_DIR = os.environ.get("ARTIFACT_DIR", None)

VIEWPORTS = [
    {"name": "desktop", "width": 1280, "height": 900, "label": "Desktop (1280x900)"},
    {"name": "tablet",  "width": 768,  "height": 1024, "label": "Tablet (768x1024)"},
    {"name": "mobile",  "width": 390,  "height": 844,  "label": "Mobile (390x844 iPhone 14)"}
]

class MarionetteClient:
    def __init__(self, host="127.0.0.1", port=PORT):
        self.host = host
        self.port = port
        self.sock = None
        self.seq = 0
        self.session_id = None

    def connect(self, timeout=10):
        start = time.time()
        while time.time() - start < timeout:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.connect((self.host, self.port))
                greeting = self._read_msg()
                print(f"[Marionette] Connected. Protocol: {greeting.get('marionetteProtocol')}")
                return
            except (ConnectionRefusedError, socket.error):
                time.sleep(0.5)
        raise TimeoutError("Could not connect to Firefox Marionette on port 2828")

    def _read_msg(self):
        buf = b""
        while b":" not in buf:
            chunk = self.sock.recv(1)
            if not chunk:
                raise ConnectionResetError("Socket closed while reading frame length")
            buf += chunk
        length = int(buf[:-1].decode("ascii"))
        body = b""
        while len(body) < length:
            chunk = self.sock.recv(length - len(body))
            if not chunk:
                raise ConnectionResetError("Socket closed while reading message body")
            body += chunk
        return json.loads(body.decode("utf-8"))

    def send_cmd(self, name, params=None):
        if params is None:
            params = {}
        self.seq += 1
        msg = [0, self.seq, name, params]
        encoded = json.dumps(msg).encode("utf-8")
        wire = f"{len(encoded)}:".encode("ascii") + encoded
        self.sock.sendall(wire)
        resp = self._read_msg()
        # [1, seq, error, result]
        if resp[2] is not None:
            raise RuntimeError(f"Marionette Error in {name}: {resp[2]}")
        return resp[3]

    def new_session(self):
        res = self.send_cmd("WebDriver:NewSession", {})
        self.session_id = res.get("sessionId")
        return res

    def set_window_rect(self, width, height):
        return self.send_cmd("WebDriver:SetWindowRect", {"width": width, "height": height})

    def navigate(self, url):
        return self.send_cmd("WebDriver:Navigate", {"url": url})

    def execute_script(self, script, args=None):
        return self.send_cmd("WebDriver:ExecuteScript", {"script": script, "args": args or []})

    def take_screenshot(self, full=False):
        res = self.send_cmd("WebDriver:TakeScreenshot", {"full": full})
        return res.get("value")

    def close(self):
        try:
            if self.session_id:
                self.send_cmd("WebDriver:DeleteSession", {})
        except Exception:
            pass
        if self.sock:
            self.sock.close()


def copy_to_artifact(path, filename):
    if ARTIFACT_DIR and os.path.isdir(ARTIFACT_DIR):
        try:
            shutil.copy2(path, os.path.join(ARTIFACT_DIR, filename))
        except Exception:
            pass

def run():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if ARTIFACT_DIR:
        os.makedirs(ARTIFACT_DIR, exist_ok=True)

    print(f"=== Starting Firefox Headless Marionette ===")
    ff_proc = subprocess.Popen(
        ["firefox", "--headless", "--marionette"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    client = MarionetteClient()
    try:
        client.connect(timeout=10)
        client.new_session()
        print(f"Session established. Target App URL: {APP_URL}")

        captured = []

        for vp in VIEWPORTS:
            device = vp["name"]
            width = vp["width"]
            height = vp["height"]
            print(f"\n📱 Setting Viewport: {vp['label']} ({width}x{height})")
            client.set_window_rect(width, height)
            time.sleep(0.5)

            # View 1: Recipe Library
            print(f"  -> Capturing Library View ({device})...")
            client.navigate(f"{APP_URL}/")
            time.sleep(1.8)
            b64 = client.take_screenshot()
            filename = f"{device}_1_library.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Library", "file": filename})

            # View 2: Cook Mode Modal
            print(f"  -> Capturing Cook Mode Modal ({device})...")
            client.execute_script("return window.RecipeCard && window.RecipeCard.openModal('lemon-herb-roast-chicken');")
            time.sleep(1.2)
            b64 = client.take_screenshot()
            filename = f"{device}_2_cook_mode.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Cook Mode", "file": filename})
            client.execute_script("return window.RecipeCard && window.RecipeCard.closeModal();")
            time.sleep(0.4)

            # View 3: Meal Plan View
            print(f"  -> Capturing Meal Plan View ({device})...")
            client.navigate(f"{APP_URL}/#plan")
            time.sleep(1.8)
            b64 = client.take_screenshot()
            filename = f"{device}_3_plan.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Meal Plan", "file": filename})

            # View 4: Plan Schedule Modal (Date Range & Start Date Picker)
            print(f"  -> Capturing Plan Schedule Modal ({device})...")
            client.execute_script("return window.PlanView && window.PlanView.openDatesModal('create');")
            time.sleep(1.0)
            b64 = client.take_screenshot()
            filename = f"{device}_4_plan_schedule_modal.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Schedule Modal", "file": filename})
            client.execute_script("return window.PlanView && window.PlanView.closeDatesModal();")
            time.sleep(0.4)

            # View 5: Smart Grocery Checklist
            print(f"  -> Capturing Smart Grocery Checklist ({device})...")
            client.navigate(f"{APP_URL}/#grocery")
            time.sleep(1.8)
            b64 = client.take_screenshot()
            filename = f"{device}_5_grocery.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Grocery Checklist", "file": filename})

            # View 6: Settings View (Gemini API, Model Selector & Zero-Rebuild Updates)
            print(f"  -> Capturing Settings View ({device})...")
            client.navigate(f"{APP_URL}/#context")
            time.sleep(1.8)
            b64 = client.take_screenshot()
            filename = f"{device}_6_settings.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Settings", "file": filename})

            # View 7: Day Assignment Modal (Interactive Day & Meal Scheduler)
            print(f"  -> Capturing Day Assignment Modal ({device})...")
            client.navigate(f"{APP_URL}/#plan")
            time.sleep(1.0)
            client.execute_script("window.PlanView.activeRecipeId = 'lemon-herb-roast-chicken'; return window.PlanView.openDayModal([], 'Dinner', window.PlanView.getActiveWeekOf(), 1);")
            time.sleep(0.8)
            b64 = client.take_screenshot()
            filename = f"{device}_7_day_modal.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Day Assignment Modal", "file": filename})
            client.execute_script("return window.PlanView && window.PlanView.closeDayModal();")
            time.sleep(0.3)

            # View 8: Recipe Import Modal (Segmented Link, Photo, PDF, Batch)
            print(f"  -> Capturing Recipe Import Modal ({device})...")
            client.navigate(f"{APP_URL}/")
            time.sleep(1.0)
            client.execute_script("return window.RecipesView && window.RecipesView.openImportModal();")
            time.sleep(0.8)
            b64 = client.take_screenshot()
            filename = f"{device}_8_import_modal.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Import Modal", "file": filename})
            client.execute_script("return window.RecipesView && window.RecipesView.closeImportModal();")
            time.sleep(0.3)

            # View 9: Kitchen Pantry Inventory Page
            print(f"  -> Capturing Pantry View ({device})...")
            client.navigate(f"{APP_URL}/#pantry")
            time.sleep(1.5)
            b64 = client.take_screenshot()
            filename = f"{device}_9_pantry.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Pantry Inventory", "file": filename})

            # View 10: Pantry AI Scan Verification Modal (Large Haul / Many Items)
            print(f"  -> Capturing Pantry Verification Modal with many items ({device})...")
            client.execute_script("""
                return window.PantryView && window.PantryView.openVerifyModal([
                    { name: 'Canned Black Beans', quantity: '2 cans', category: 'Pantry' },
                    { name: 'Avocado', quantity: '3 ripe', category: 'Produce' },
                    { name: 'Cheddar Cheese', quantity: '1 block (8 oz)', category: 'Dairy' },
                    { name: 'Soy Sauce', quantity: '1 bottle', category: 'Spices & Oils' },
                    { name: 'Sourdough Bread', quantity: '1 loaf', category: 'Bakery' },
                    { name: 'Greek Yogurt', quantity: '32 oz tub', category: 'Dairy' },
                    { name: 'Boneless Chicken Thighs', quantity: '2.5 lbs', category: 'Proteins' },
                    { name: 'Broccoli Florets', quantity: '2 crowns', category: 'Produce' },
                    { name: 'Jasmine Rice', quantity: '5 lb bag', category: 'Pantry' },
                    { name: 'Olive Oil', quantity: '1 bottle', category: 'Spices & Oils' },
                    { name: 'Whole Milk', quantity: '1 gallon', category: 'Dairy' },
                    { name: 'Yellow Onions', quantity: '3 lb bag', category: 'Produce' }
                ]);
            """)
            time.sleep(0.8)
            b64 = client.take_screenshot()
            filename = f"{device}_10_pantry_verify_modal.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Pantry Verify Modal", "file": filename})

            # Also capture scrolled state on mobile
            if device == "mobile":
                client.execute_script("""
                    const list = document.getElementById('pantry-verify-list');
                    if (list) list.scrollTop = list.scrollHeight;
                """)
                time.sleep(0.5)
                b64_scrolled = client.take_screenshot()
                filename_scrolled = f"{device}_10_pantry_verify_modal_scrolled.png"
                path_scrolled = os.path.join(OUTPUT_DIR, filename_scrolled)
                with open(path_scrolled, "wb") as f:
                    f.write(base64.b64decode(b64_scrolled))
                copy_to_artifact(path_scrolled, filename_scrolled)
                captured.append({"device": device, "view": "Pantry Verify Modal (Scrolled)", "file": filename_scrolled})

            client.execute_script("return window.PantryView && window.PantryView.closeVerifyModal();")
            time.sleep(0.3)

            # View 11: Kitchen Matrix - 3-Pane Schedule Grid
            print(f"  -> Capturing Kitchen Matrix Schedule ({device})...")
            client.navigate(f"{APP_URL}/#matrix")
            time.sleep(1.8)
            b64 = client.take_screenshot()
            filename = f"{device}_11_matrix_schedule.png"
            path = os.path.join(OUTPUT_DIR, filename)
            with open(path, "wb") as f:
                f.write(base64.b64decode(b64))
            copy_to_artifact(path, filename)
            captured.append({"device": device, "view": "Matrix Schedule", "file": filename})

            # For Desktop: also capture all workbook sheets
            if device == "desktop":
                # View 12: Matrix - Master Recipes Sheet
                print(f"  -> Capturing Matrix Master Recipes Sheet ({device})...")
                client.execute_script("return window.MatrixView && window.MatrixView.switchSheet('recipes');")
                time.sleep(0.8)
                b64 = client.take_screenshot()
                filename = f"{device}_12_matrix_recipes.png"
                path = os.path.join(OUTPUT_DIR, filename)
                with open(path, "wb") as f:
                    f.write(base64.b64decode(b64))
                copy_to_artifact(path, filename)
                captured.append({"device": device, "view": "Matrix Master Recipes", "file": filename})

                # View 13: Matrix - Master Pantry Sheet
                print(f"  -> Capturing Matrix Master Pantry Sheet ({device})...")
                client.execute_script("return window.MatrixView && window.MatrixView.switchSheet('pantry');")
                time.sleep(0.8)
                b64 = client.take_screenshot()
                filename = f"{device}_13_matrix_pantry.png"
                path = os.path.join(OUTPUT_DIR, filename)
                with open(path, "wb") as f:
                    f.write(base64.b64decode(b64))
                copy_to_artifact(path, filename)
                captured.append({"device": device, "view": "Matrix Master Pantry", "file": filename})

                # View 14: Matrix - Master Grocery Sheet
                print(f"  -> Capturing Matrix Master Grocery Sheet ({device})...")
                client.execute_script("return window.MatrixView && window.MatrixView.switchSheet('grocery');")
                time.sleep(0.8)
                b64 = client.take_screenshot()
                filename = f"{device}_14_matrix_grocery.png"
                path = os.path.join(OUTPUT_DIR, filename)
                with open(path, "wb") as f:
                    f.write(base64.b64decode(b64))
                copy_to_artifact(path, filename)
                captured.append({"device": device, "view": "Matrix Master Grocery", "file": filename})

        print(f"\n✅ All {len(captured)} screenshots captured successfully!")
        print(f"📁 Local directory: {OUTPUT_DIR}")
        print(f"📁 Artifact directory: {ARTIFACT_DIR}")

    finally:
        client.close()
        ff_proc.terminate()
        try:
            ff_proc.wait(timeout=3)
        except Exception:
            ff_proc.kill()

if __name__ == "__main__":
    run()
