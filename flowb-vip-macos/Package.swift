// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FlowBVIP",
    platforms: [
        .macOS(.v14),
    ],
    targets: [
        .executableTarget(
            name: "FlowBVIP",
            path: "FlowBVIP"
        ),
    ]
)
