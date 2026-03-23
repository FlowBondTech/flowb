import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

interface Props {
  children: ReactNode
  screenName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // Log to console for debugging
    console.error('=== CRASH REPORT ===')
    console.error('Screen:', this.props.screenName || 'Unknown')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    console.error('Component Stack:', errorInfo.componentStack)
    console.error('===================')
  }

  handleShare = async () => {
    const { error, errorInfo } = this.state
    const report = `
DANZ App Crash Report
=====================
Screen: ${this.props.screenName || 'Unknown'}
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
Time: ${new Date().toISOString()}
    `.trim()

    try {
      await Share.share({ message: report, title: 'DANZ Crash Report' })
    } catch (e) {
      console.error('Failed to share:', e)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state

      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.emoji}>💥</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.screenName}>Screen: {this.props.screenName || 'Unknown'}</Text>

            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Error:</Text>
              <Text style={styles.errorText}>{error?.message}</Text>
            </View>

            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Stack Trace:</Text>
              <Text style={styles.stackText} numberOfLines={15}>
                {error?.stack}
              </Text>
            </View>

            {errorInfo && (
              <View style={styles.errorBox}>
                <Text style={styles.errorLabel}>Component Stack:</Text>
                <Text style={styles.stackText} numberOfLines={10}>
                  {errorInfo.componentStack}
                </Text>
              </View>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.shareButton]}
                onPress={this.handleShare}
              >
                <Text style={styles.buttonText}>Share Report</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      )
    }

    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  screenName: {
    fontSize: 16,
    color: '#888',
    marginBottom: 24,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.3)',
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  stackText: {
    fontSize: 11,
    color: '#ccc',
    fontFamily: 'monospace',
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  shareButton: {
    backgroundColor: '#22c55e',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ErrorBoundary
