#!/usr/bin/env python3
"""
Fenêtre simple de confirmation de scan
Utilise tkinter pour une interface graphique légère
"""

import sys
import tkinter as tk
from tkinter import messagebox
import requests
import json

def confirm_delivery(renewal_id, scan_type, api_url, api_token):
    """Affiche une fenêtre de confirmation et envoie à l'API"""
    
    # Créer la fenêtre principale
    root = tk.Tk()
    root.title("Confirmation de délivrance")
    root.geometry("400x300")
    root.resizable(False, False)
    
    # Centrer la fenêtre
    root.update_idletasks()
    x = (root.winfo_screenwidth() // 2) - (400 // 2)
    y = (root.winfo_screenheight() // 2) - (300 // 2)
    root.geometry(f"400x300+{x}+{y}")
    
    # Récupérer les informations du patient depuis l'API
    patient_info = None
    delivery_date = None
    renewal_number = None
    
    try:
        response = requests.get(
            f"{api_url}/api/renewals/scan-info",
            params={"renewalId": renewal_id, "type": scan_type},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                patient_info = data.get("patient", {})
                delivery_date = data.get("dateDelivrance", "")
                renewal_number = data.get("numeroRenouvellement", "")
    except Exception as e:
        print(f"Erreur récupération info: {e}")
    
    # Interface
    frame = tk.Frame(root, padx=20, pady=20)
    frame.pack(fill=tk.BOTH, expand=True)
    
    # Titre
    title_label = tk.Label(
        frame,
        text="Confirmation de délivrance",
        font=("Arial", 16, "bold")
    )
    title_label.pack(pady=(0, 20))
    
    # Informations patient
    info_frame = tk.Frame(frame)
    info_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
    
    if patient_info:
        patient_name = f"{patient_info.get('nom', '').upper()} {patient_info.get('prenom', '')}"
        tk.Label(
            info_frame,
            text=f"Patient: {patient_name}",
            font=("Arial", 12),
            anchor="w"
        ).pack(fill=tk.X, pady=5)
        
        if delivery_date:
            tk.Label(
                info_frame,
                text=f"Date: {delivery_date}",
                font=("Arial", 12),
                anchor="w"
            ).pack(fill=tk.X, pady=5)
        
        if renewal_number:
            tk.Label(
                info_frame,
                text=f"Renouvellement: R{renewal_number}",
                font=("Arial", 12),
                anchor="w"
            ).pack(fill=tk.X, pady=5)
    else:
        tk.Label(
            info_frame,
            text=f"RenewalId: {renewal_id}",
            font=("Arial", 12),
            anchor="w"
        ).pack(fill=tk.X, pady=5)
        tk.Label(
            info_frame,
            text=f"Type: {scan_type}",
            font=("Arial", 12),
            anchor="w"
        ).pack(fill=tk.X, pady=5)
    
    # Question
    question_label = tk.Label(
        frame,
        text="Voulez-vous délivrer les médicaments ?",
        font=("Arial", 11, "bold")
    )
    question_label.pack(pady=(0, 15))
    
    # Variables pour le résultat
    result = {"confirmed": False}
    
    def on_yes():
        result["confirmed"] = True
        root.quit()
        root.destroy()
    
    def on_no():
        result["confirmed"] = False
        root.quit()
        root.destroy()
    
    # Boutons
    button_frame = tk.Frame(frame)
    button_frame.pack()
    
    yes_btn = tk.Button(
        button_frame,
        text="OUI",
        command=on_yes,
        bg="#4CAF50",
        fg="white",
        font=("Arial", 12, "bold"),
        width=10,
        height=2
    )
    yes_btn.pack(side=tk.LEFT, padx=10)
    
    no_btn = tk.Button(
        button_frame,
        text="NON",
        command=on_no,
        bg="#f44336",
        fg="white",
        font=("Arial", 12, "bold"),
        width=10,
        height=2
    )
    no_btn.pack(side=tk.LEFT, padx=10)
    
    # Afficher la fenêtre au premier plan
    root.lift()
    root.attributes("-topmost", True)
    root.after_idle(root.attributes, "-topmost", False)
    root.focus_force()
    
    # Lancer la boucle
    root.mainloop()
    
    # Envoyer à l'API si confirmé
    if result["confirmed"]:
        try:
            # Essayer d'abord l'API authentifiée
            response = requests.post(
                f"{api_url}/api/renewals/confirm-delivery",
                json={
                    "renewalId": renewal_id,
                    "type": scan_type
                },
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            # Si erreur d'authentification, utiliser l'API publique
            if response.status_code == 401:
                response = requests.post(
                    f"{api_url}/api/renewals/confirm-delivery-public",
                    json={
                        "renewalId": renewal_id,
                        "type": scan_type,
                        "apiToken": api_token
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    messagebox.showinfo("Succès", "Délivrance confirmée avec succès !")
                    return True
                else:
                    messagebox.showerror("Erreur", f"Erreur: {data.get('error', 'Erreur inconnue')}")
            else:
                messagebox.showerror("Erreur", f"Erreur HTTP: {response.status_code}")
        except Exception as e:
            messagebox.showerror("Erreur", f"Erreur de connexion: {str(e)}")
    
    return result["confirmed"]

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python scan-confirm.py <renewalId> <type> [apiUrl] [apiToken]")
        sys.exit(1)
    
    renewal_id = sys.argv[1]
    scan_type = sys.argv[2]
    api_url = sys.argv[3] if len(sys.argv) > 3 else "https://renouvellement-ordonnance.vercel.app"
    api_token = sys.argv[4] if len(sys.argv) > 4 else ""
    
    confirm_delivery(renewal_id, scan_type, api_url, api_token)

