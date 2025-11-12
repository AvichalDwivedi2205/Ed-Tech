import matplotlib.pyplot as plt
import numpy as np

np.random.seed(42)  # For reproducibility

# Generate data
# Simulate a grid representing an area scanned by a satellite
x = np.linspace(-10, 10, 50)
y = np.linspace(-10, 10, 50)
X, Y = np.meshgrid(x, y)

# Z will represent a 'surface property index' or 'polarization response'
# We'll create a base undulating surface, similar to terrain
Z = np.sin(np.sqrt(X**2 + Y**2) / 2) * 2 + np.cos(X/3) + np.sin(Y/4)

# Add features that could represent different surface properties detectable by polarization
# For instance, a 'smooth' area (lower Z)
Z -= 2 * np.exp(-((X - 4)**2 + (Y - 3)**2) / 5)

# A 'rough' or 'anomalous' area (higher Z)
Z += 3 * np.exp(-((X + 5)**2 + (Y + 2)**2) / 7)

# Another feature, perhaps a water body or different land cover
Z += 1.5 * np.exp(-((X + 1)**2 + (Y - 6)**2) / 3)

# Create plot
fig = plt.figure(figsize=(10, 8))
ax = fig.add_subplot(111, projection='3d')

# Plot the surface
# The colormap can represent the varying intensity or type of polarization signal
surf = ax.plot_surface(X, Y, Z, cmap='viridis', edgecolor='none', alpha=0.9)

# Set labels and title
ax.set_title('Visualization 3')
ax.set_xlabel('X (Spatial Coordinate)')
ax.set_ylabel('Y (Spatial Coordinate)')
ax.set_zlabel('Polarization-Derived Surface Index')

# Add a color bar which maps values to colors.
fig.colorbar(surf, shrink=0.5, aspect=5, label='Surface Property Value')

# Adjust view angle for better visualization
ax.view_init(elev=30, azim=-60)

plt.tight_layout()
# Do NOT include 