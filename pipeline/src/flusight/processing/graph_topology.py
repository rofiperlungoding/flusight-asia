
# Static Adjacency Matrix (Simplified Travel/Proximity Graph)
# Weights: 1.0 (Direct/High Vol), 0.5 (Regional), 0.2 (Distant)
ASIA_GRAPH = {
    "nodes": [
        "China", "Japan", "South Korea", 
        "Singapore", "Thailand", "Vietnam", 
        "Indonesia", "India", "Malaysia", "Philippines"
    ],
    "edges": [
        ("China", "Japan", 1.0),
        ("China", "South Korea", 1.0),
        ("China", "Thailand", 0.8),
        ("Japan", "South Korea", 1.0),
        ("Singapore", "Thailand", 0.9),
        ("Singapore", "Indonesia", 0.9),
        ("Singapore", "Malaysia", 1.0),
        ("Malaysia", "Thailand", 0.8),
        ("Thailand", "Vietnam", 0.7),
        ("Vietnam", "China", 0.6),
        ("India", "Singapore", 0.6),
        ("Philippines", "Singapore", 0.6)
    ]
}
