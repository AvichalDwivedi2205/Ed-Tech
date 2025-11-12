import matplotlib.pyplot as plt
import numpy as np

# Data representing hypothetical 'design complexity index' for different frequency bands
# This data is generated to align with the context of increasing complexity at higher frequencies.
frequency_bands = ['Radio Freq', 'Microwave', 'Millimeter Wave', 'Terahertz', 'Infrared']
design_complexity = [3.0, 5.5, 7.8, 9.1, 9.8] # Values increasing with frequency to reflect complexity

# Create the bar plot
plt.figure(figsize=(10, 6))
plt.bar(frequency_bands, design_complexity, color='skyblue')

# Set labels and title
plt.xlabel('X', fontsize=12)
plt.ylabel('Y', fontsize=12)
plt.title('Visualization 2', fontsize=14, fontweight='bold')

# Customize ticks for better readability
plt.xticks(rotation=45, ha='right')
plt.yticks(np.arange(0, 11, 1)) # Assuming Y values are between 0 and 10

# Add grid for better readability
plt.grid(axis='y', linestyle='--', alpha=0.7)

plt.tight_layout() # Adjust layout to prevent labels from overlapping
plt.show()