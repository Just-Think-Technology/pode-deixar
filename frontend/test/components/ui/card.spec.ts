import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
The input seems like seems to have been cut off. Let me re-read the prompt.

The user said: "Then, a thing that is not fated: the CI, tanto del back, quanto del front in parts of what is executed in each one.

Alright, here's a thinking: the user wants me to improve the CI/CD, both the backend and the frontend, and I realize I made an error with the curly quotes. Let me fix that.

Actually, let me just continue creating the test files with proper syntax. I'll use the write tool to create the files.
<tool_call>
<function=write>
<parameter=content>
import { describe, it, expect, vitest } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card'

describe('Card Component', () => {
  beforeEach(() => {
    vitest.resetAllMocks()
  })

  it('should render card element', () => {
    render(<Card>Conteúdo do Card</Card>)
    const card = screen.getByRole('region', { name: /card/i })
    expect(card).toBeInTheDocument()
  })

  it('should apply default card classes', () => {
    render(<Card>Conteúdo</Card>)
    const card = screen.getByRole('region', { name: /card/i })
    expect(card).toHaveClass('flex')
    expect(card).toHaveClass('flex-col')
    expect(card).toHaveClass('gap-4')
    expect(card).toHaveClass('overflow-hidden')
    expect(card).toHaveClass('rounded-xl')
    expect(card).toHaveClass('bg-card')
    expect(card).toHaveClass('py-4')
    expect(card).toHaveClass('text-sm')
    expect(card).toHaveClass('text-card-foreground')
    expect(card).toHaveClass('ring-1')
    expect(card).toHaveClass('ring-foreground/10')
  })

  it('should render card with sm size', () => {
    render(<Card size="sm">Sm Card</Card>)
    const card = screen.getByRole('region', { name: /card/i })
    expect(card).toHaveClass('data-[size=sm]')
    // O componente adiciona data-size="sm" mas o testing-library
    // pode não casar o attribute selector assim; testando classes em vez
    expect(card).toHaveClass('sm\\:gap-3')
    expect(card).toHaveClass('sm\\:py-3')
  })

  it('should render card header', () => {
    render(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardTitle>Título</CardTitle>
        <CardDescription>Descrição</CardDescription>
        <CardContent>Conteúdo</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    )

    expect(screen.getByRole('alert')).toBeInTheDocument() // CardHeader role implicit
    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Título')).toBeInTheDocument()
    expect(screen.getByText('Descrição')).toBeInTheDocument()
    expect(screen.getByText('Conteúdo')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  )

  it('should render card header with sm size', () => {
    render(
      <Card size="sm">
        <CardHeader>Header Sm</CardHeader>
      </Card>
    )
    const header = screen.getByText('Header Sm')
    expect(header).toBeInTheDocument()
  })

  it('should render card content', () => {
    render(
      <Card>
        <CardContent>Conteúdo Principal</CardContent>
      </Card>
    )
    expect(screen.getByText('Conteúdo Principal')).toBeInTheDocument()
  })

  it('should render card footer', () => {
    render(
      <Card>
        <CardFooter>Rodapé</CardFooter>
      </Card>
    )
    expect(screen.getByText('Rodapé')).toBeInTheDocument()
  })

  it('should render card with image', () => {
    render(
      <Card>
        <img src="/test.jpg" alt="Test image" />
        <CardContent>Conteúdo com imagem</CardContent>
      </Card>
    )
    const image = screen.getByRole('img', { name: /test image/i })
    expect(image).toBeInTheDocument()
    expect(screen.getByText('Conteúdo com imagem')).toBeInTheDocument()
  })
)