#!/usr/bin/env python3
import os
import shutil

def remove_duplicate_specs():
    """Remove folders from .kiro/specs that also exist in specs/"""
    root_specs = '/home/avich/openT/specs'
    kiro_specs = '/home/avich/openT/.kiro/specs'
    
    if not os.path.isdir(root_specs):
        print(f"Warning: {root_specs} does not exist")
        return
    
    if not os.path.isdir(kiro_specs):
        print(f"Warning: {kiro_specs} does not exist")
        return
    
    # Get folders in root specs
    root_folders = set()
    if os.path.isdir(root_specs):
        for item in os.listdir(root_specs):
            item_path = os.path.join(root_specs, item)
            if os.path.isdir(item_path):
                root_folders.add(item)
    
    # Get folders in .kiro/specs and delete duplicates
    deleted = []
    errors = []
    
    for item in os.listdir(kiro_specs):
        item_path = os.path.join(kiro_specs, item)
        if os.path.isdir(item_path) and item in root_folders:
            try:
                shutil.rmtree(item_path)
                deleted.append(item)
                print(f"Deleted duplicate spec folder: {item}")
            except Exception as e:
                errors.append(f"{item}: {e}")
                print(f"Error deleting {item}: {e}")
    
    print(f"\nTotal deleted: {len(deleted)} duplicate spec folders")
    if errors:
        print(f"Errors: {len(errors)}")

def remove_duplicate_steering():
    """Remove files from .kiro/steering that also exist in steering/"""
    root_steering = '/home/avich/openT/steering'
    kiro_steering = '/home/avich/openT/.kiro/steering'
    
    if not os.path.isdir(root_steering):
        print(f"Warning: {root_steering} does not exist")
        return
    
    if not os.path.isdir(kiro_steering):
        print(f"Warning: {kiro_steering} does not exist")
        return
    
    # Get files in root steering
    root_files = set()
    if os.path.isdir(root_steering):
        for item in os.listdir(root_steering):
            item_path = os.path.join(root_steering, item)
            if os.path.isfile(item_path):
                root_files.add(item)
    
    # Get files in .kiro/steering and delete duplicates
    deleted = []
    errors = []
    
    for item in os.listdir(kiro_steering):
        item_path = os.path.join(kiro_steering, item)
        if os.path.isfile(item_path) and item in root_files:
            try:
                os.remove(item_path)
                deleted.append(item)
                print(f"Deleted duplicate steering file: {item}")
            except Exception as e:
                errors.append(f"{item}: {e}")
                print(f"Error deleting {item}: {e}")
    
    print(f"\nTotal deleted: {len(deleted)} duplicate steering files")
    if errors:
        print(f"Errors: {len(errors)}")

if __name__ == '__main__':
    print("Removing duplicates from .kiro directories...")
    print("\n=== Removing duplicate spec folders ===")
    remove_duplicate_specs()
    print("\n=== Removing duplicate steering files ===")
    remove_duplicate_steering()
    print("\nDone!")

