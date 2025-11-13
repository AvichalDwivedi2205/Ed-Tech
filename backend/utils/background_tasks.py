"""
Background task utilities for async operations
"""
import uuid
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum


class TaskStatus(str, Enum):
    """Task status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"


class TaskManager:
    """Simple in-memory task manager for progress tracking"""
    
    def __init__(self):
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self._cleanup_interval = 3600  # 1 hour
    
    def create_task(self, initial_data: Optional[Dict[str, Any]] = None) -> str:
        """Create a new task and return task ID"""
        task_id = str(uuid.uuid4())
        task_data = {
            "task_id": task_id,
            "status": TaskStatus.PENDING,
            "progress": 0.0,
            "current_step": "",
            "actions": [],
            "result": None,
            "error": None,
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        if initial_data:
            task_data.update(initial_data)
        self.tasks[task_id] = task_data
        return task_id
    
    def update_task(self, task_id: str, **kwargs) -> bool:
        """Update task with new data"""
        if task_id not in self.tasks:
            return False
        
        self.tasks[task_id].update(kwargs)
        self.tasks[task_id]["updated_at"] = datetime.now()
        return True
    
    def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get task by ID"""
        return self.tasks.get(task_id)
    
    def set_status(self, task_id: str, status: TaskStatus, error: Optional[str] = None):
        """Set task status"""
        if task_id not in self.tasks:
            return
        
        self.tasks[task_id]["status"] = status
        if error:
            self.tasks[task_id]["error"] = error
        self.tasks[task_id]["updated_at"] = datetime.now()
    
    def add_action(self, task_id: str, action: Dict[str, Any]):
        """Add action to task"""
        if task_id not in self.tasks:
            return
        
        if "actions" not in self.tasks[task_id]:
            self.tasks[task_id]["actions"] = []
        
        self.tasks[task_id]["actions"].append(action)
        self.tasks[task_id]["updated_at"] = datetime.now()
    
    def set_result(self, task_id: str, result: Any):
        """Set task result"""
        if task_id not in self.tasks:
            return
        
        self.tasks[task_id]["result"] = result
        self.tasks[task_id]["status"] = TaskStatus.COMPLETED
        self.tasks[task_id]["progress"] = 100.0
        self.tasks[task_id]["updated_at"] = datetime.now()
    
    def cleanup_old_tasks(self, max_age_hours: int = 24):
        """Remove tasks older than max_age_hours"""
        cutoff = datetime.now() - timedelta(hours=max_age_hours)
        to_remove = [
            task_id for task_id, task_data in self.tasks.items()
            if task_data["updated_at"] < cutoff
        ]
        for task_id in to_remove:
            del self.tasks[task_id]
        return len(to_remove)


# Global task manager instance
task_manager = TaskManager()

