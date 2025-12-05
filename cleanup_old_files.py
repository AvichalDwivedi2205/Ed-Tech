#!/usr/bin/env python3
import os
import shutil
import sys

def delete_old_specs():
    """Delete old spec directories that don't match the project"""
    specs_dir = '/home/avich/openT/.kiro/specs'
    
    # Keep these new folders
    keep_folders = {
        'workspace-management', 'roadmap-generation', 'content-generation',
        'deep-research-agent', 'flashcard-generation', 'quiz-generation',
        'notes-generation', 'rag-retrieval-augmented-generation',
        'document-processing', 'ocr-integration', 'search-tools-integration',
        'web-scraping-tools', 'minidrona-ai-assistant', 'theme-dark-mode',
        'convex-integration'
    }
    
    deleted = []
    errors = []
    
    if not os.path.isdir(specs_dir):
        print(f"Error: {specs_dir} does not exist")
        return
    
    for item in os.listdir(specs_dir):
        item_path = os.path.join(specs_dir, item)
        if os.path.isdir(item_path) and item not in keep_folders:
            try:
                shutil.rmtree(item_path)
                deleted.append(item)
                print(f"Deleted spec folder: {item}")
            except Exception as e:
                errors.append(f"{item}: {e}")
                print(f"Error deleting {item}: {e}")
    
    # Also remove spec.md from deep-research-agent if it exists
    spec_md = os.path.join(specs_dir, 'deep-research-agent', 'spec.md')
    if os.path.isfile(spec_md):
        try:
            os.remove(spec_md)
            print("Deleted: deep-research-agent/spec.md")
        except Exception as e:
            print(f"Error deleting spec.md: {e}")
    
    print(f"\nTotal deleted: {len(deleted)} spec folders")
    if errors:
        print(f"Errors: {len(errors)}")

def delete_old_steering():
    """Delete old steering files that don't match the project"""
    steering_dir = '/home/avich/openT/.kiro/steering'
    
    # Keep these files
    keep_files = {
        'agent-development.md', 'convex-integration.md', 'development-workflow.md',
        'document-processing.md', 'frontend-guidelines.md', 'project-overview.md',
        'rag-service.md', 'search-tools.md'
    }
    
    deleted = []
    errors = []
    
    if not os.path.isdir(steering_dir):
        print(f"Error: {steering_dir} does not exist")
        return
    
    for item in os.listdir(steering_dir):
        item_path = os.path.join(steering_dir, item)
        if os.path.isfile(item_path) and item not in keep_files:
            try:
                os.remove(item_path)
                deleted.append(item)
                print(f"Deleted steering file: {item}")
            except Exception as e:
                errors.append(f"{item}: {e}")
                print(f"Error deleting {item}: {e}")
    
    print(f"\nTotal deleted: {len(deleted)} steering files")
    if errors:
        print(f"Errors: {len(errors)}")

if __name__ == '__main__':
    print("Cleaning up old files...")
    print("\n=== Deleting old spec folders ===")
    delete_old_specs()
    print("\n=== Deleting old steering files ===")
    delete_old_steering()
    print("\nCleanup complete!")

